import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria";
const tenantId="zones-"+randomUUID().replace(/-/g,"").slice(0,16);
const zones=[{id:"centro",name:"Centro",feeCents:750,neighborhoods:["Centro","Jardim São José"]},
  {id:"vila",name:"Vila Verde",feeCents:1250,neighborhoods:["Vila Verde"]}];
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
const settings=()=>httpsCallable<{tenantId:string},{settings:{
  deliveryFeeCents:number;deliveryZones?:typeof zones
}}>(functions,"getPublicCheckoutSettings")({tenantId});
const update=(z:typeof zones,id=tenantId)=>httpsCallable(functions,"updateTenantDeliveryZones")({tenantId:id,zones:z});
const read=(id=tenantId)=>httpsCallable<{tenantId:string},{zones:typeof zones}>(
  functions,"getTenantDeliveryZones")({tenantId:id});
const checkout=(neighborhood:string,mode:"delivery"|"pickup"="delivery")=>
  httpsCallable(functions,"createOrder")({
    tenantId,fulfillmentMode:mode,
    customer:{name:"Cliente de teste",phone:"11999999999"},
    ...(mode==="delivery"?{address:{street:"Rua 1",number:"10",neighborhood,reference:""}}:{}),
    paymentMethodId:"cash",items:[{productId:"pot-classic",quantity:2,selections:{}}],
    deliveryFeeCents:0, // Malicious/obsolete client value must never set the charge.
    requestId:randomUUID(),
  });
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=initializeAdminApp({projectId},"delivery-zone-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:zone"},"delivery-zone-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({slug:tenantId,status:"active",planId:"pro",subscriptionStatus:"active",
    features:{onlineMenu:true,delivery:true,pickup:true,qrCodes:true}});
  await db.doc("memberships/"+tenantId+"_owner-alpha").set({
    userId:"owner-alpha",tenantId,role:"tenant_owner",status:"active",
  });
  await ref.collection("settings").doc("main").set({deliveryFeeCents:500,estimatedMinutes:35,
    paymentMethods:[{id:"cash",label:"Dinheiro",enabled:true}]});
  await ref.collection("categories").doc("gelatos").set({name:"Sorvetes",active:true,sortOrder:1});
  await ref.collection("products").doc("pot-classic").set({name:"Sorvete",description:"",
    categoryId:"gelatos",available:true,kind:"pot",priceCents:1000,optionGroups:[]});
});
afterAll(async()=>{
  if(auth?.currentUser)await signOut(auth);
  if(admin){
    const db=getAdminFirestore(admin);
    await db.recursiveDelete(db.doc("tenants/"+tenantId));
    await db.doc("memberships/"+tenantId+"_owner-alpha").delete();
    await deleteAdminApp(admin);
  }
  if(app)await deleteApp(app);
});
describe("zone configuration and server-side checkout fee enforcement",()=>{
  it("denies unauthorized update/read and cross-tenant managers",async()=>{
    await expect(read()).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("owner.beta@demo.sorveteria.test");
    await expect(read()).rejects.toMatchObject({code:"functions/permission-denied"});
    await expect(update(zones)).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("driver.alpha@demo.sorveteria.test");
    await expect(read()).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("owner.alpha@demo.sorveteria.test");
    await expect(read("../"+tenantId)).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("validates all coverage and only publishes configured fields",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await expect(update([{...zones[0],neighborhoods:["Centro","centro"]}]))
      .rejects.toMatchObject({code:"functions/invalid-argument"});
    await update(zones);
    expect((await read()).data.zones).toEqual(zones);
    const response=(await settings()).data.settings;
    expect(response.deliveryZones).toEqual(zones);
    expect(JSON.stringify(response)).not.toMatch(/customer|auditLogs|membership|privateDeliveryCodes/);
  });
  it("recalculates the fee from normalized neighborhood, blocks unsupported addresses and preserves pickup",async()=>{
    await login("customer.alpha@demo.sorveteria.test");
    const center=(await checkout("Jardim Sao Jose")).data as {orderId:string};
    const edge=(await checkout("vila verde")).data as {orderId:string};
    const pickup=(await checkout("", "pickup")).data as {orderId:string};
    const db=getAdminFirestore(admin),orders=db.collection("tenants/"+tenantId+"/orders");
    expect((await orders.doc(center.orderId).get()).data()).toMatchObject({
      deliveryZoneId:"centro",money:{subtotalCents:2000,deliveryFeeCents:750,totalCents:2750}});
    expect((await orders.doc(edge.orderId).get()).data()).toMatchObject({
      deliveryZoneId:"vila",money:{subtotalCents:2000,deliveryFeeCents:1250,totalCents:3250}});
    expect((await orders.doc(pickup.orderId).get()).data()).toMatchObject({
      deliveryZoneId:null,money:{subtotalCents:2000,deliveryFeeCents:0,totalCents:2000}});
    await expect(checkout("Bairro sem cobertura")).rejects.toMatchObject({code:"functions/failed-precondition"});
  });
  it("downgrading to Essencial disables zones without breaking the basic delivery fee",async()=>{
    const ref=getAdminFirestore(admin).doc("tenants/"+tenantId);
    await ref.update({planId:"essencial"});
    const publicSettings=(await settings()).data.settings;
    expect(publicSettings.deliveryZones).toBeUndefined();
    const order=(await checkout("Bairro sem cobertura")).data as {orderId:string};
    const saved=await ref.collection("orders").doc(order.orderId).get();
    expect(saved.data()?.money.deliveryFeeCents).toBe(500);
    await login("owner.alpha@demo.sorveteria.test");
    await expect(update(zones)).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({planId:"pro"});
  });
});

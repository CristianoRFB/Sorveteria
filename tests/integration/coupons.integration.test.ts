import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria",tenantId="coupon-"+randomUUID().replace(/-/g,"").slice(0,16);
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
type Coupon={code:string;kind:"percent"|"fixed";value:number;minSubtotalCents:number;
  maxUses:number|null;active:boolean;expiresAt:string|null};
const template=(code:string,patch:Partial<Coupon>={}):Coupon=>({
  code,kind:"percent",value:10,minSubtotalCents:1000,maxUses:10,active:true,expiresAt:null,...patch,
});
const list=(id=tenantId)=>httpsCallable<{tenantId:string},{coupons:Array<Coupon&{usedCount:number}>}>(
  functions,"getTenantCoupons")({tenantId:id});
const upsert=(coupon:Coupon,id=tenantId)=>httpsCallable(functions,"upsertTenantCoupon")({tenantId:id,coupon});
const create=(couponCode?:string,requestId=randomUUID(),quantity=2)=>
  httpsCallable<{tenantId:string;fulfillmentMode:string;customer:object;paymentMethodId:string;
    items:object[];requestId:string;couponCode?:string},
    {orderId:string;replayed:boolean;discountCents:number;totalCents:number}>(functions,"createOrder")({
    tenantId,fulfillmentMode:"pickup",customer:{name:"Cliente teste",phone:"11999990000"},
    paymentMethodId:"cash",items:[{productId:"pot-classic",quantity,selections:{}}],
    requestId,...(couponCode?{couponCode}:{}),
  });
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=initializeAdminApp({projectId},"coupon-integration-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:coupon"},"coupon-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({slug:tenantId,status:"active",planId:"pro",subscriptionStatus:"active",
    features:{onlineMenu:true,pickup:true,delivery:true}});
  await Promise.all([
    ["owner-alpha","tenant_owner"],["staff-alpha","staff"],
  ].map(([uid,role])=>db.doc("memberships/"+tenantId+"_"+uid).set({
    userId:uid,tenantId,role,status:"active",
  })));
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
    await Promise.all(["owner-alpha","staff-alpha"].map(uid=>
      db.doc("memberships/"+tenantId+"_"+uid).delete()));
    await deleteAdminApp(admin);
  }
  if(app)await deleteApp(app);
});
describe("Pro coupon transactions and tenant isolation",()=>{
  it("prevents anonymous, staff, driver and cross-tenant coupon administration",async()=>{
    await expect(list()).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("owner.beta@demo.sorveteria.test");
    await expect(list()).rejects.toMatchObject({code:"functions/permission-denied"});
    await expect(upsert(template("TESTE-BETA"))).rejects.toMatchObject({code:"functions/permission-denied"});
    for(const email of ["staff.alpha","driver.alpha"]){
      await login(email+"@demo.sorveteria.test");
      await expect(list()).rejects.toMatchObject({code:"functions/permission-denied"});
    }
    await login("owner.alpha@demo.sorveteria.test");
    await expect(list("../"+tenantId)).rejects.toMatchObject({code:"functions/invalid-argument"});
    await expect(upsert(template("INVALIDO",{value:200})))
      .rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("creates scoped percentage coupon, discounts only products and counts single redemption",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await upsert(template("GELATO10"));
    expect((await list()).data.coupons.find(x=>x.code==="GELATO10")).toMatchObject({
      value:10,usedCount:0,active:true,
    });
    await login("customer.alpha@demo.sorveteria.test");
    const requestId=randomUUID();
    const first=(await create(" gelato10 ",requestId)).data;
    expect(first).toMatchObject({discountCents:200,totalCents:1800,replayed:false});
    const replay=(await create("GELATO10",requestId)).data;
    expect(replay).toMatchObject({orderId:first.orderId,replayed:true,discountCents:200,totalCents:1800});
    await expect(create("GELATO11",requestId)).rejects.toMatchObject({code:"functions/already-exists"});
    const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
    const order=(await ref.collection("orders").doc(first.orderId).get()).data();
    expect(order).toMatchObject({couponCode:"GELATO10",
      money:{subtotalCents:2000,deliveryFeeCents:0,discountCents:200,totalCents:1800}});
    expect((await ref.collection("coupons").doc("GELATO10").get()).data()?.usedCount).toBe(1);
    await login("owner.alpha@demo.sorveteria.test");
    await expect(upsert(template("GELATO10",{value:20}))).rejects.toMatchObject({code:"functions/failed-precondition"});
    await upsert(template("GELATO10",{active:false}));
    expect((await list()).data.coupons.find(x=>x.code==="GELATO10")?.active).toBe(false);
  });
  it("enforces fixed discount cap, minimum order, expiration, invalid and inactive code",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await upsert(template("FIXO5000",{kind:"fixed",value:5000,minSubtotalCents:1000}));
    await upsert(template("MINIMO99",{minSubtotalCents:9900}));
    await upsert(template("VENCIDO99",{expiresAt:"2020-01-01"}));
    await login("customer.alpha@demo.sorveteria.test");
    const fixed=(await create("FIXO5000")).data;
    expect(fixed).toMatchObject({discountCents:2000,totalCents:0});
    for(const code of ["MINIMO99","VENCIDO99","GELATO10","NADA0001"]){
      await expect(create(code)).rejects.toMatchObject({code:"functions/failed-precondition"});
    }
    const noCode=(await create()).data;
    expect(noCode).toMatchObject({discountCents:0,totalCents:2000});
  });
  it("allows only one concurrent redemption when usage cap is one",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await upsert(template("ULTIMO01",{maxUses:1}));
    await login("customer.alpha@demo.sorveteria.test");
    const results=await Promise.allSettled([create("ULTIMO01"),create("ULTIMO01")]);
    expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(x=>x.status==="rejected")).toHaveLength(1);
    const db=getAdminFirestore(admin);
    expect((await db.doc("tenants/"+tenantId+"/coupons/ULTIMO01").get()).data()?.usedCount).toBe(1);
  });
  it("enforces downgrade to Essencial and suspended overrides for coupons",async()=>{
    const ref=getAdminFirestore(admin).doc("tenants/"+tenantId);
    await ref.update({planId:"essencial"});
    await login("owner.alpha@demo.sorveteria.test");
    await expect(list()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await login("customer.alpha@demo.sorveteria.test");
    await expect(create("FIXO5000")).rejects.toMatchObject({code:"functions/failed-precondition"});
    expect((await create()).data.totalCents).toBe(2000);
    await ref.update({planId:"pro",entitlementOverrides:{coupons:false}});
    await expect(create("FIXO5000")).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({entitlementOverrides:{}});
  });
});

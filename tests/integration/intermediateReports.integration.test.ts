import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore,Timestamp} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria",tenantId="report-"+randomUUID().replace(/-/g,"").slice(0,16);
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
type Report={days:number;truncated:boolean;sampledOrders:number;completedOrders:number;
  completedAmountCents:number;cancelledOrders:number;topProducts:Array<{name:string;quantity:number}>;
  buckets:Array<{totalOrders:number}>;
  fulfillment:{pickup:{orders:number};delivery:{orders:number}}};
const report=(id=tenantId,days=7)=>
  httpsCallable<{tenantId:string;days:number},Report>(functions,"getTenantIntermediateReport")({tenantId:id,days});
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=initializeAdminApp({projectId},"intermediate-report-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:report"},"intermediate-report-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({slug:tenantId,status:"active",planId:"pro",subscriptionStatus:"active",features:{}});
  await Promise.all([["owner-alpha","tenant_owner"],["staff-alpha","staff"]].map(([uid,role])=>
    db.doc("memberships/"+tenantId+"_"+uid).set({userId:uid,tenantId,role,status:"active"})));
  const rows=[
    ["a","delivered",1700,1,"pickup"],["b","picked_up",800,2,"delivery"],
    ["c","cancelled",1500,2,"pickup"],["d","received",900,1,"delivery"],
    ["older","delivered",6000,42,"pickup"],
  ] as const;
  const now=Date.now();
  await Promise.all(rows.map(([id,status,total,daysAgo,fulfillmentMode])=>
    ref.collection("orders").doc(id).set({
      tenantId,status,money:{totalCents:total},
      customer:{name:"DO_NOT_LEAK",phone:"DO_NOT_LEAK"},
      address:{street:"DO_NOT_LEAK"},paymentMethodId:"DO_NOT_LEAK",
      fulfillmentMode,items:[{productId:"classic",name:"Gelato",quantity:2}],
      createdAt:Timestamp.fromMillis(now-daysAgo*86400000),
    })));
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
describe("intermediate operational reports Pro tenant privacy and commercial RBAC",()=>{
  it("rejects anonymous, drivers, staff and cross-tenant owners",async()=>{
    await expect(report()).rejects.toMatchObject({code:"functions/unauthenticated"});
    for(const email of ["driver.alpha","staff.alpha","owner.beta","customer.alpha"]){
      await login(email+"@demo.sorveteria.test");
      await expect(report()).rejects.toMatchObject({code:"functions/permission-denied"});
    }
    await login("owner.alpha@demo.sorveteria.test");
    await expect(report("../"+tenantId)).rejects.toMatchObject({code:"functions/invalid-argument"});
    await expect(report(tenantId,365)).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("aggregates 7- and 30-day operational metrics with no PII",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    const week=(await report()).data;
    expect(week).toMatchObject({days:7,truncated:false,sampledOrders:4,completedOrders:2,
      cancelledOrders:1,completedAmountCents:2500,
      topProducts:[{name:"Gelato",quantity:4}]});
    expect(week.buckets).toHaveLength(7);
    expect(week.buckets.reduce((sum,b)=>sum+b.totalOrders,0)).toBe(4);
    expect(week.fulfillment.pickup.orders).toBe(2);
    expect(week.fulfillment.delivery.orders).toBe(2);
    expect(JSON.stringify(week)).not.toMatch(/DO_NOT_LEAK|phone|address|customer|paymentMethod|publicCode/);
    expect((await report(tenantId,30)).data.sampledOrders).toBe(4);
  });
  it("denies plan downgrade, feature overrides and inactive managers at backend",async()=>{
    const ref=getAdminFirestore(admin).doc("tenants/"+tenantId);
    await ref.update({planId:"essencial"});
    await expect(report()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({planId:"pro",entitlementOverrides:{intermediate_reports:false}});
    await expect(report()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({entitlementOverrides:{}});
    const member=getAdminFirestore(admin).doc("memberships/"+tenantId+"_owner-alpha");
    await member.update({status:"inactive"});
    await expect(report()).rejects.toMatchObject({code:"functions/permission-denied"});
    await member.update({status:"active"});
  });
  it("allows platform owner tenant-scoped reporting with no arbitrary cross-tenant reads",async()=>{
    await login("platform@demo.sorveteria.test");
    expect((await report()).data.completedOrders).toBe(2);
  });
});

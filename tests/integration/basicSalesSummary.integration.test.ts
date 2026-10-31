import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as adminFirestore,Timestamp} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria";
const tenantId="summary-"+randomUUID().replace(/-/g,"").slice(0,16);
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
type Summary={days:number;periodStart:string;periodEnd:string;totalOrders:number;
  completedOrders:number;cancelledOrders:number;pendingOrders:number;
  completedAmountCents:number;averageCompletedTicketCents:number};
const summary=(requestedTenant:string,days:number)=>
  httpsCallable<{tenantId:string;days:number},Summary>(functions,"getTenantSalesSummary")({
    tenantId:requestedTenant,days,
  });
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=initializeAdminApp({projectId},"sales-summary-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:sales-summary"},"sales-summary-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=adminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({status:"active",slug:tenantId,planId:"essencial",subscriptionStatus:"active",features:{}});
  await db.doc("memberships/"+tenantId+"_owner-alpha").set({
    tenantId,userId:"owner-alpha",role:"tenant_owner",status:"active",
  });
  const now=Date.now();
  const rows=[
    ["a","delivered",1750,1],["b","picked_up",950,1],
    ["c","cancelled",1200,1],["d","received",990,1],
    ["e","delivered",2500,10],["old","delivered",9999,50],
  ] as const;
  await Promise.all(rows.map(([id,status,amount,daysAgo])=>ref.collection("orders").doc(id).set({
    tenantId,status,money:{totalCents:amount},
    createdAt:Timestamp.fromMillis(now-daysAgo*86400000),
  })));
});
afterAll(async()=>{
  if(auth?.currentUser)await signOut(auth);
  if(admin){await adminFirestore(admin).recursiveDelete(adminFirestore(admin).doc("tenants/"+tenantId));
    await adminFirestore(admin).doc("memberships/"+tenantId+"_owner-alpha").delete();
    await deleteAdminApp(admin);}
  if(app)await deleteApp(app);
});
describe("7/30-day server-side sales summary aggregations and tenant RBAC",()=>{
  it("denies anonymous, drivers, customers and cross-tenant owners",async()=>{
    await expect(summary(tenantId,7)).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("driver.alpha@demo.sorveteria.test");
    await expect(summary(tenantId,7)).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("owner.beta@demo.sorveteria.test");
    await expect(summary(tenantId,7)).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("customer.alpha@demo.sorveteria.test");
    await expect(summary(tenantId,7)).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("returns complete period aggregates without customer/order personal data",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    const week=(await summary(tenantId,7)).data;
    expect(week).toMatchObject({days:7,totalOrders:4,completedOrders:2,
      cancelledOrders:1,pendingOrders:1,completedAmountCents:2700,averageCompletedTicketCents:1350});
    expect(Date.parse(week.periodStart)).toBeLessThan(Date.parse(week.periodEnd));
    expect(JSON.stringify(week)).not.toMatch(/customer|phone|address|driver|paymentMethod|email/);
    const month=(await summary(tenantId,30)).data;
    expect(month).toMatchObject({days:30,totalOrders:5,completedOrders:3,
      cancelledOrders:1,pendingOrders:1,completedAmountCents:5200,averageCompletedTicketCents:1733});
  });
  it("denies invalid filters and enforces feature overrides",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await expect(summary(tenantId,365)).rejects.toMatchObject({code:"functions/invalid-argument"});
    await expect(summary("../"+tenantId,7)).rejects.toMatchObject({code:"functions/invalid-argument"});
    const ref=adminFirestore(admin).doc("tenants/"+tenantId);
    await ref.update({entitlementOverrides:{basic_sales_summary:false}});
    await expect(summary(tenantId,7)).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({entitlementOverrides:{}});
  });
  it("allows the Platform Owner with tenant-scoped aggregation only",async()=>{
    await login("platform@demo.sorveteria.test");
    expect((await summary(tenantId,7)).data.completedOrders).toBe(2);
  });
});

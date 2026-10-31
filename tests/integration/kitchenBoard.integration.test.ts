import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {deleteApp,initializeApp,type FirebaseApp} from "firebase/app";
import {initializeApp as adminInitializeApp,deleteApp as adminDeleteApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore,Timestamp} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria";
const tenantId="kds-"+randomUUID().replace(/-/g,"").slice(0,16);
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
type Ticket={id:string;tenantId:string;publicCode:string;status:string;items:Array<{name:string;quantity:number}>};
const kitchen=(id:string)=>
  httpsCallable<{tenantId:string},{tickets:Ticket[];limited:boolean;refreshedAt:string}>(
    functions,"getTenantKitchenBoard")({tenantId:id});
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=adminInitializeApp({projectId},"kds-integration-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:kds"},"kds-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({slug:tenantId,status:"active",planId:"pro",subscriptionStatus:"active",features:{}});
  await Promise.all([
    ["owner-alpha","tenant_owner"],["staff-alpha","staff"],
  ].map(([uid,role])=>db.doc("memberships/"+tenantId+"_"+uid).set({
    userId:uid,tenantId,role,status:"active",
  })));
  const statuses=["received","confirmed","preparing","ready","delivered"] as const;
  const batch=db.batch();
  statuses.forEach((status,i)=>{
    const publicCode="SV-ABCDEFG"+(i+2);
    const record={
      tenantId,publicCode,status,fulfillmentMode:"pickup",customer:{name:"SECRET CUSTOMER",phone:"SECRET PHONE"},
      address:{street:"SECRET STREET"},paymentMethodId:"SECRET PAYMENT",
      items:[{name:"Pote",quantity:1,selections:{size:["small"]},lineTotalCents:1200}],
      createdAt:Timestamp.fromMillis(Date.now()-((statuses.length-i)*1000)),
      timeline:[{status,at:new Date().toISOString()}],
    };
    batch.set(ref.collection("orders").doc("ticket-"+i),record);
    batch.set(ref.collection("publicOrderTracking").doc(publicCode),{
      publicCode,status,fulfillmentMode:"pickup",timeline:record.timeline,estimatedMinutes:30,
    });
  });
  await batch.commit();
});
afterAll(async()=>{
  if(auth?.currentUser)await signOut(auth);
  if(admin){
    const db=getAdminFirestore(admin);
    await db.recursiveDelete(db.doc("tenants/"+tenantId));
    await Promise.all(["owner-alpha","staff-alpha"].map(uid=>
      db.doc("memberships/"+tenantId+"_"+uid).delete()));
    await adminDeleteApp(admin);
  }
  if(app)await deleteApp(app);
});
describe("KDS Pro tenant-scoped board",()=>{
  it("denies unauthenticated, drivers, customers and Beta owners",async()=>{
    await expect(kitchen(tenantId)).rejects.toMatchObject({code:"functions/unauthenticated"});
    for(const email of ["driver.alpha","customer.alpha","owner.beta"]){
      await login(email+"@demo.sorveteria.test");
      await expect(kitchen(tenantId)).rejects.toMatchObject({code:"functions/permission-denied"});
    }
    await login("owner.alpha@demo.sorveteria.test");
    await expect(kitchen("tenant-alpha")).rejects.toMatchObject({code:"functions/failed-precondition"});
    await expect(kitchen("../"+tenantId)).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("returns a bounded, sorted allowlisted kitchen board for Owner and Staff",async()=>{
    for(const email of ["owner.alpha","staff.alpha"]){
      await login(email+"@demo.sorveteria.test");
      const board=(await kitchen(tenantId)).data;
      expect(board.tickets.map(ticket=>ticket.status)).toEqual(["received","confirmed","preparing","ready"]);
      expect(board.tickets.map(ticket=>ticket.id)).toEqual(["ticket-0","ticket-1","ticket-2","ticket-3"]);
      expect(board.tickets[0]).toMatchObject({tenantId,publicCode:"SV-ABCDEFG2",
        items:[{name:"Pote",quantity:1}]});
      expect(board.limited).toBe(false);
      expect(Date.parse(board.refreshedAt)).not.toBeNaN();
      expect(JSON.stringify(board)).not.toMatch(/SECRET|customer|paymentMethod|address|lineTotal|deliveryCode/);
    }
  });
  it("updates preparation through the existing audited state transition callable",async()=>{
    await login("staff.alpha@demo.sorveteria.test");
    const change=httpsCallable(functions,"updateOrderStatus");
    for(const status of ["confirmed","preparing","ready"]){
      await change({tenantId,orderId:"ticket-0",status});
    }
    const board=(await kitchen(tenantId)).data;
    expect(board.tickets.find(x=>x.id==="ticket-0")?.status).toBe("ready");
    await expect(change({tenantId,orderId:"ticket-0",status:"received"}))
      .rejects.toMatchObject({code:"functions/failed-precondition"});
    const db=getAdminFirestore(admin);
    const audit=await db.collection("tenants/"+tenantId+"/auditLogs")
      .where("action","==","order.status_changed").get();
    expect(audit.size).toBeGreaterThanOrEqual(3);
  });
  it("enforces deactivated memberships, plan downgrades and overrides at server boundary",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    const db=getAdminFirestore(admin);
    const member=db.doc("memberships/"+tenantId+"_owner-alpha");
    const tenant=db.doc("tenants/"+tenantId);
    await member.update({status:"inactive"});
    await expect(kitchen(tenantId)).rejects.toMatchObject({code:"functions/permission-denied"});
    await member.update({status:"active"});
    await tenant.update({planId:"essencial"});
    await expect(kitchen(tenantId)).rejects.toMatchObject({code:"functions/failed-precondition"});
    await tenant.update({planId:"premium",entitlementOverrides:{kds:false}});
    await expect(kitchen(tenantId)).rejects.toMatchObject({code:"functions/failed-precondition"});
    await tenant.update({planId:"pro",entitlementOverrides:{}});
    expect((await kitchen(tenantId)).data.tickets.length).toBe(4);
  });
});

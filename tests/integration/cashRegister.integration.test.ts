import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

const projectId="demo-sorveteria",tenantId="cash-"+randomUUID().replace(/-/g,"").slice(0,16);
let app:FirebaseApp,admin:AdminApp,auth:Auth,functions:Functions;
type ShiftResponse={shiftId:string;replayed:boolean};
type MovementResponse={shiftId:string;replayed:boolean;expectedCents:number};
type CloseResponse={shiftId:string;expectedCents:number;countedCents:number;differenceCents:number};
type CashSnapshot={activeShift:{id:string;status:string;expectedCents:number}|null;
  movements:Array<{kind:string;amountCents:number;note:string}>;
  recentShifts:Array<{id:string;status:string;differenceCents:number|null}>};
const snapshot=(id=tenantId)=>httpsCallable<{tenantId:string},CashSnapshot>(
  functions,"getTenantCashRegister")({tenantId:id});
const open=(openingCents=5000,requestId:string=randomUUID(),id=tenantId)=>
  httpsCallable<{tenantId:string;openingCents:number;requestId:string},ShiftResponse>(
    functions,"openTenantCashShift")({tenantId:id,openingCents,requestId});
const move=(shiftId:string,kind:"inflow"|"outflow",amountCents:number,
  requestId:string=randomUUID(),note="Troco conferido",id=tenantId)=>
  httpsCallable<{tenantId:string;shiftId:string;requestId:string;kind:string;amountCents:number;note:string},
    MovementResponse>(functions,"recordTenantCashMovement")({
    tenantId:id,shiftId,kind,amountCents,requestId,note});
const close=(shiftId:string,countedCents:number,id=tenantId)=>
  httpsCallable<{tenantId:string;shiftId:string;countedCents:number},CloseResponse>(
    functions,"closeTenantCashShift")({tenantId:id,shiftId,countedCents});
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,"GelatoDev!2026");
}
beforeAll(async()=>{
  admin=initializeAdminApp({projectId},"cash-register-integration-admin");
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:projectId+".appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:cash-register"},"cash-register-integration");
  auth=getAuth(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
  const db=getAdminFirestore(admin),ref=db.doc("tenants/"+tenantId);
  await ref.set({slug:tenantId,status:"active",planId:"pro",subscriptionStatus:"active",features:{}});
  await Promise.all([["owner-alpha","tenant_owner"],["staff-alpha","staff"]].map(([uid,role])=>
    db.doc("memberships/"+tenantId+"_"+uid).set({userId:uid,tenantId,role,status:"active"})));
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
describe("manual cash register transactional and commercial tenant boundaries",()=>{
  it("requires authentication, scoped cashier or manager role, and strictly valid tenant",async()=>{
    await expect(snapshot()).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("owner.beta@demo.sorveteria.test");
    await expect(snapshot()).rejects.toMatchObject({code:"functions/permission-denied"});
    await expect(open()).rejects.toMatchObject({code:"functions/permission-denied"});
    for(const email of ["staff.alpha","driver.alpha","customer.alpha"]){
      await login(email+"@demo.sorveteria.test");
      await expect(snapshot()).rejects.toMatchObject({code:"functions/permission-denied"});
    }
    await login("owner.alpha@demo.sorveteria.test");
    await expect(snapshot("../"+tenantId)).rejects.toMatchObject({code:"functions/invalid-argument"});
    await expect(open(-1)).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("allows only one open shift per tenant and idempotent retries",async()=>{
    const id=randomUUID();
    const attempts=await Promise.allSettled([open(5000,id),open(5000,randomUUID())]);
    expect(attempts.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(attempts.filter(x=>x.status==="rejected")).toHaveLength(1);
    const created=attempts.find(x=>x.status==="fulfilled");
    if(!created||created.status!=="fulfilled")throw new Error("No shift created");
    const shiftId=created.value.data.shiftId;
    expect((await snapshot()).data.activeShift?.id).toBe(shiftId);
    const retryId=shiftId.slice(3);
    expect((await open(5000,retryId)).data).toMatchObject({shiftId,replayed:true});
    await expect(open(6000,retryId)).rejects.toMatchObject({code:"functions/already-exists"});
    await expect(open()).rejects.toMatchObject({code:"functions/failed-precondition"});
  });
  it("keeps cash movements atomic and idempotent, including concurrent overspending",async()=>{
    const current=(await snapshot()).data.activeShift;
    if(!current)throw new Error("Open shift missing");
    const requestId=randomUUID();
    expect((await move(current.id,"inflow",2000,requestId)).data)
      .toMatchObject({replayed:false,expectedCents:7000});
    expect((await move(current.id,"inflow",2000,requestId)).data.replayed).toBe(true);
    await expect(move(current.id,"inflow",2100,requestId))
      .rejects.toMatchObject({code:"functions/already-exists"});
    const results=await Promise.allSettled([
      move(current.id,"outflow",5000),move(current.id,"outflow",5000),
    ]);
    expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(x=>x.status==="rejected")).toHaveLength(1);
    const state=(await snapshot()).data;
    expect(state.activeShift?.expectedCents).toBe(2000);
    expect(state.movements).toHaveLength(2);
    const ref=getAdminFirestore(admin).doc("tenants/"+tenantId+"/cashShifts/"+current.id);
    expect((await ref.get()).data()).toMatchObject({
      openingCents:5000,inflowCents:2000,outflowCents:5000,expectedCents:2000});
    expect(JSON.stringify(state)).not.toMatch(/openedBy|createdBy|closedBy|customer|paymentMethod/);
  });
  it("cashier role works but a revoked cashier cannot write any shift",async()=>{
    const ref=getAdminFirestore(admin).doc("memberships/"+tenantId+"_staff-alpha");
    await ref.update({role:"cashier"});
    await login("staff.alpha@demo.sorveteria.test");
    const cash=(await snapshot()).data.activeShift;
    if(!cash)throw new Error("Active shift missing");
    expect((await move(cash.id,"inflow",300)).data.expectedCents).toBe(2300);
    await ref.update({status:"inactive"});
    await expect(move(cash.id,"inflow",300)).rejects.toMatchObject({code:"functions/permission-denied"});
    await expect(snapshot()).rejects.toMatchObject({code:"functions/permission-denied"});
    await ref.update({role:"staff",status:"active"});
    await login("owner.alpha@demo.sorveteria.test");
  });
  it("closes with immutable discrepancy, blocks further movements and supports new shifts",async()=>{
    const active=(await snapshot()).data.activeShift;
    if(!active)throw new Error("Shift missing");
    expect((await close(active.id,2100)).data).toMatchObject({
      expectedCents:2300,countedCents:2100,differenceCents:-200});
    await expect(close(active.id,2100)).rejects.toMatchObject({code:"functions/failed-precondition"});
    await expect(move(active.id,"inflow",10)).rejects.toMatchObject({code:"functions/failed-precondition"});
    const data=(await snapshot()).data;
    expect(data.activeShift).toBeNull();
    expect(data.recentShifts.find(x=>x.id===active.id)).toMatchObject({
      status:"closed",differenceCents:-200});
    expect((await open(0)).data.replayed).toBe(false);
  });
  it("blocks plan downgrade, override and suspension without changing saved cash",async()=>{
    const ref=getAdminFirestore(admin).doc("tenants/"+tenantId);
    await ref.update({planId:"essencial"});
    await expect(snapshot()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await expect(open()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({planId:"pro",entitlementOverrides:{cash_register:false}});
    await expect(snapshot()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({entitlementOverrides:{},subscriptionStatus:"suspended"});
    await expect(snapshot()).rejects.toMatchObject({code:"functions/failed-precondition"});
    await ref.update({subscriptionStatus:"active"});
    expect((await snapshot()).data.activeShift?.expectedCents).toBe(0);
  });
  it("permits Platform Owner only through tenant-scoped callable",async()=>{
    await login("platform@demo.sorveteria.test");
    expect((await snapshot()).data.activeShift?.expectedCents).toBe(0);
    await expect(snapshot("../../../other")).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
});

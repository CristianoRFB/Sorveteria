import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {deleteApp,initializeApp,type FirebaseApp} from "firebase/app";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFirestoreEmulator,doc,getDoc,getFirestore,type Firestore} from "firebase/firestore";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";
let app:FirebaseApp,auth:Auth,db:Firestore,functions:Functions;
beforeAll(()=>{
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId:"demo-sorveteria",
    storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:public-tenant-privacy"},"public-tenant-privacy-integration");
  auth=getAuth(app);db=getFirestore(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [fh,fp]=(process.env.SORVETERIA_FIRESTORE_EMULATOR_HOST||"127.0.0.1:8088").split(":");
  connectFirestoreEmulator(db,fh,Number(fp));
  const [ch,cp]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,ch,Number(cp));
});
afterAll(async()=>{if(auth?.currentUser)await signOut(auth);if(app)await deleteApp(app);});
const tenant=(slug:string)=>httpsCallable<{slug:string},{tenant:{id:string;slug:string;status:string}|null}>(
  functions,"getPublicTenant")({slug});
const checkout=(tenantId:string)=>httpsCallable<{tenantId:string},{settings:{
  deliveryFeeCents:number;estimatedMinutes:number;paymentMethods:Array<{id:string;label:string;enabled:boolean}>
}|null}>(functions,"getPublicCheckoutSettings")({tenantId});
describe("public storefront and checkout HTTPS isolation",()=>{
  it("returns only Alpha/Beta public profiles with no internal metadata",async()=>{
    const alpha=(await tenant("tenant-alpha")).data.tenant;
    const beta=(await tenant("tenant-beta")).data.tenant;
    expect(alpha).toMatchObject({id:"tenant-alpha",slug:"tenant-alpha",status:"active"});
    expect(beta).toMatchObject({id:"tenant-beta",slug:"tenant-beta",status:"active"});
    expect(JSON.stringify(alpha)).not.toMatch(/commercialAssignedBy|commercialRevision|createdAt|updatedAt|limitOverrides/);
    expect((await tenant("missing-tenant")).data.tenant).toBeNull();
    await expect(tenant("../tenant-beta")).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("returns only customer checkout details and denies malformed tenant paths",async()=>{
    const alpha=(await checkout("tenant-alpha")).data.settings;
    expect(alpha?.deliveryFeeCents).toBe(500);
    expect(alpha?.paymentMethods.some(x=>x.id==="cash")).toBe(true);
    expect(JSON.stringify(alpha)).not.toMatch(/createdAt|updatedAt|adminPassword|secret/);
    await expect(checkout("../tenant-beta")).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
  it("protects raw tenant/settings from customers without blocking HTTPS",async()=>{
    await signInWithEmailAndPassword(auth,"customer.alpha@demo.sorveteria.test","GelatoDev!2026");
    await expect(getDoc(doc(db,"tenants/tenant-alpha"))).rejects.toMatchObject({code:"permission-denied"});
    await expect(getDoc(doc(db,"tenants/tenant-alpha/settings/main"))).rejects.toMatchObject({code:"permission-denied"});
    expect((await tenant("tenant-alpha")).data.tenant?.id).toBe("tenant-alpha");
    await signOut(auth);
  });
});

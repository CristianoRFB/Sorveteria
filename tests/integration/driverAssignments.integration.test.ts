import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";
const password="GelatoDev!2026";
let app:FirebaseApp;
let auth:Auth;
let functions:Functions;
beforeAll(()=>{
  app=initializeApp({
    apiKey:"demo-api-key",authDomain:"localhost",projectId:"demo-sorveteria",
    storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:driver-assignments",
  },"driver-assignments-integration");
  auth=getAuth(app);
  functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
});
afterAll(async()=>{
  if(auth?.currentUser)await signOut(auth);
  if(app)await deleteApp(app);
});
async function login(email:string){
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,password);
}
const list=(tenantId:string)=>httpsCallable<{tenantId:string},{deliveries:Array<{
  id:string;tenantId:string;driverId:string;orderId:string;status:string;
  customer?:{name:string;phone:string};address?:{street:string;number:string;neighborhood:string};
}>}>(functions,"getDriverAssignments")({tenantId});
describe("driver delivery HTTPS snapshot: RBAC, privacy and isolation",()=>{
  it("denies unauthenticated callers and Owner users",async()=>{
    if(auth.currentUser)await signOut(auth);
    await expect(list("tenant-alpha")).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("owner.alpha@demo.sorveteria.test");
    await expect(list("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("allows a driver to see only its assignments within the same tenant",async()=>{
    await login("driver.alpha@demo.sorveteria.test");
    const result=(await list("tenant-alpha")).data;
    expect(result.deliveries).toBeInstanceOf(Array);
    expect(result.deliveries.length).toBeLessThanOrEqual(50);
    expect(result.deliveries.every(d=>d.tenantId==="tenant-alpha")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/deliveryCodeHash|privateDeliveryCodes|paymentMethodId|confirmationCode/);
  });
  it("does not let Alpha driver access Beta or vice-versa",async()=>{
    await login("driver.alpha@demo.sorveteria.test");
    await expect(list("tenant-beta")).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("driver.beta@demo.sorveteria.test");
    await expect(list("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("rejects malformed tenant paths",async()=>{
    await login("driver.alpha@demo.sorveteria.test");
    await expect(list("../tenant-beta")).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
});

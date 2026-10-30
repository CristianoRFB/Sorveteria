import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

let app:FirebaseApp;
let auth:Auth;
let functions:Functions;
const secret = "GelatoDev!2026";
beforeAll(()=>{
  app=initializeApp({
    apiKey:"demo-api-key",authDomain:"localhost",projectId:"demo-sorveteria",
    storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:owner-rbac",
  },"owner-operation-rbac-test");
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
const snapshot=(tenantId:string)=>httpsCallable<{tenantId:string},{
  orders:Array<{id:string;tenantId:string;status:string;publicCode:string}>;
  deliveries:Array<{id:string;tenantId:string;orderId:string}>;
  drivers:Array<{id:string;tenantId:string;userId:string}>;
}>(functions,"getTenantOperationsSnapshot")({tenantId});
async function login(email:string) {
  if(auth.currentUser)await signOut(auth);
  await signInWithEmailAndPassword(auth,email,secret);
}
type CatalogSnapshot = {categories:Array<{id:string;name:string}>;products:Array<{id:string;name:string;categoryId:string}>};
const catalog = (tenantId:string) =>
  httpsCallable<{tenantId:string},CatalogSnapshot>(functions,"getTenantAdminCatalog")({tenantId});
describe("admin catalog snapshot permissions",()=>{
  it("denies unauthenticated users, drivers and cross-tenant Owners",async()=>{
    if(auth.currentUser)await signOut(auth);
    await expect(catalog("tenant-alpha")).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("driver.alpha@demo.sorveteria.test");
    await expect(catalog("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
    await login("owner.beta@demo.sorveteria.test");
    await expect(catalog("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("returns Alpha categories and products to authorized Owner without leaking private tenant data",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    const data=(await catalog("tenant-alpha")).data;
    expect(data.products.map(x=>x.id)).toContain("pot-classic");
    expect(data.categories.map(x=>x.id)).toContain("gelatos");
    expect(JSON.stringify(data)).not.toMatch(/deliveryCodeHash|privateDeliveryCodes|customerId|paymentMethodId/);
  });
  it("rejects tenant path traversal and permits scoped Platform Owner context",async()=>{
    await login("platform@demo.sorveteria.test");
    await expect(catalog("../tenant-beta")).rejects.toMatchObject({code:"functions/invalid-argument"});
    expect((await catalog("tenant-beta")).data.products.length).toBeGreaterThan(0);
  });
});

describe("Owner HTTPS operations snapshot RBAC and Alpha/Beta isolation",()=>{
  it("denies unauthenticated and driver roles from operational PII",async()=>{
    if (auth.currentUser) await signOut(auth);
    await expect(snapshot("tenant-alpha")).rejects.toMatchObject({code:"functions/unauthenticated"});
    await login("driver.alpha@demo.sorveteria.test");
    await expect(snapshot("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("denies Beta owner access to Alpha orders",async()=>{
    await login("owner.beta@demo.sorveteria.test");
    await expect(snapshot("tenant-alpha")).rejects.toMatchObject({code:"functions/permission-denied"});
  });
  it("allows Alpha owner to read only Alpha data with no delivery secrets",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    const response=(await snapshot("tenant-alpha")).data;
    expect(response.orders).toBeInstanceOf(Array);
    expect(response.drivers).toBeInstanceOf(Array);
    expect(response.deliveries).toBeInstanceOf(Array);
    expect(response.drivers.map(d=>d.userId)).toContain("driver-alpha");
    expect(response.drivers.map(d=>d.userId)).not.toContain("driver-beta");
    for(const entry of [...response.orders,...response.drivers,...response.deliveries]){
      expect(entry.tenantId).toBe("tenant-alpha");
    }
    expect(JSON.stringify(response)).not.toMatch(/deliveryCodeHash|privateDeliveryCodes|confirmationCode|resetToken/);
  });
  it("allows authorized Platform Owner context without granting cross-tenant access to clients",async()=>{
    await login("platform@demo.sorveteria.test");
    const alpha=(await snapshot("tenant-alpha")).data;
    const beta=(await snapshot("tenant-beta")).data;
    expect(alpha.orders.every(o=>o.tenantId==="tenant-alpha")).toBe(true);
    expect(beta.orders.every(o=>o.tenantId==="tenant-beta")).toBe(true);
  });
  it("rejects malformed tenant IDs",async()=>{
    await login("owner.alpha@demo.sorveteria.test");
    await expect(snapshot("../tenant-beta")).rejects.toMatchObject({code:"functions/invalid-argument"});
  });
});

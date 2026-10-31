import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp,type FirebaseApp} from "firebase/app";
import {initializeApp as initializeAdminApp,deleteApp as deleteAdminApp,type App as AdminApp} from "firebase-admin/app";
import {getFirestore as getAdminFirestore} from "firebase-admin/firestore";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";

let app:FirebaseApp, admin:AdminApp, auth:Auth, functions:Functions;
const projectId="demo-sorveteria";
beforeAll(()=>{
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId,
    storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:catalog-pagination"},"catalog-pagination-integration");
  admin=initializeAdminApp({projectId},"catalog-pagination-admin");
  auth=getAuth(app);
  functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [host,port]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,host,Number(port));
});
afterAll(async()=>{
  if(auth?.currentUser)await signOut(auth);
  if(app)await deleteApp(app);
  if(admin)await deleteAdminApp(admin);
});
type CatalogResponse={categories:Array<{id:string;active:boolean}>;products:Array<{id:string;available:boolean}>;
  nextCursor:string|null};
async function collect(call:(cursor:string|null)=>Promise<CatalogResponse>){
  const seen=new Set<string>(); const all:string[]=[]; let cursor:string|null=null;
  for(;;){
    const page=await call(cursor);
    all.push(...page.products.map(x=>x.id));
    if(page.nextCursor===null)return {all,reads:seen.size+1};
    expect(seen.has(page.nextCursor)).toBe(false);
    seen.add(page.nextCursor);
    cursor=page.nextCursor;
  }
}
describe("unlimited approved product quotas: Firestore real pagination",()=>{
  it("returns all 115 products across multiple pages and filters unavailable ones",async()=>{
    const tenantId="tenant-catalog-"+randomUUID().slice(0,8);
    const db=getAdminFirestore(admin);
    const tenant=db.doc("tenants/"+tenantId);
    const refs=[] as Array<ReturnType<typeof db.doc>>;
    const batch=db.batch();
    batch.set(tenant,{status:"active",slug:tenantId,branding:{displayName:"Catalog Paging Fixture"}});
    const category=tenant.collection("categories").doc("gelatos");
    batch.set(category,{name:"Gelatos",active:true,sortOrder:0});
    refs.push(category);
    for(let i=0;i<115;i++){
      const doc=tenant.collection("products").doc("catalog-page-"+String(i).padStart(4,"0"));
      refs.push(doc);
      batch.set(doc,{name:"Teste "+i,description:"Produto sintetico",categoryId:"gelatos",
        kind:"pot",priceCents:1000,available:true,optionGroups:[]});
    }
    const hidden=tenant.collection("products").doc("catalog-unavailable");
    batch.set(hidden,{name:"Invisivel",description:"",categoryId:"gelatos",kind:"pot",
      priceCents:100,available:false,optionGroups:[]});
    refs.push(hidden);
    await batch.commit();
    const read=(name:string)=>
      httpsCallable<{tenantId:string;cursor:string|null},CatalogResponse>(functions,name);
    try {
      const publicRead=read("getPublicCatalog");
      const publicResult=await collect(async cursor=>(await publicRead({tenantId,cursor})).data);
      expect(publicResult.all).toHaveLength(115);
      expect(new Set(publicResult.all).size).toBe(115);
      expect(publicResult.reads).toBeGreaterThanOrEqual(2);
      expect(publicResult.all).not.toContain("catalog-unavailable");
      await signInWithEmailAndPassword(auth,"platform@demo.sorveteria.test","GelatoDev!2026");
      const adminRead=read("getTenantAdminCatalog");
      const adminResult=await collect(async cursor=>(await adminRead({tenantId,cursor})).data);
      expect(adminResult.all).toHaveLength(116);
      expect(adminResult.all).toContain("catalog-unavailable");
      expect(adminResult.reads).toBeGreaterThanOrEqual(2);
    } finally {
      const cleanup=db.batch();for(const doc of refs)cleanup.delete(doc);
      cleanup.delete(tenant);
      await cleanup.commit();
    }
  },120_000);
});

import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {deleteApp,initializeApp,type FirebaseApp} from "firebase/app";
import {connectAuthEmulator,getAuth,signInWithEmailAndPassword,signOut,type Auth} from "firebase/auth";
import {connectFirestoreEmulator,doc,getDoc,getFirestore,type Firestore} from "firebase/firestore";
import {connectFunctionsEmulator,getFunctions,httpsCallable,type Functions} from "firebase/functions";
/** Emulator diagnostic: exercise the actual public HTTPS tracking path 24 times. */
let app:FirebaseApp,auth:Auth,db:Firestore,functions:Functions;
beforeAll(async()=>{
  app=initializeApp({apiKey:"demo-api-key",authDomain:"localhost",projectId:"demo-sorveteria",
    storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
    appId:"1:000000000000:web:tracking-reliability"},"tracking-reliability-integration");
  auth=getAuth(app);db=getFirestore(app);functions=getFunctions(app,"southamerica-east1");
  connectAuthEmulator(auth,"http://"+(process.env.SORVETERIA_AUTH_EMULATOR_HOST||"127.0.0.1:9099"),{disableWarnings:true});
  const [fh,fp]=(process.env.SORVETERIA_FIRESTORE_EMULATOR_HOST||"127.0.0.1:8088").split(":");
  connectFirestoreEmulator(db,fh,Number(fp));
  const [ch,cp]=(process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST||"127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,ch,Number(cp));
  await signInWithEmailAndPassword(auth,"customer.alpha@demo.sorveteria.test","GelatoDev!2026");
});
afterAll(async()=>{if(auth?.currentUser)await signOut(auth);if(app)await deleteApp(app);});
describe("public tracking: HTTPS reliability and isolation",()=>{
  it("completes repeated concurrent allowlisted reads and blocks raw Firestore",async()=>{
    const checkout=httpsCallable(functions,"createOrder");
    const response=await checkout({
      tenantId:"tenant-alpha",requestId:randomUUID(),fulfillmentMode:"pickup",
      customer:{name:"Tracking load fixture",phone:"11999990000"},paymentMethodId:"cash",
      items:[{productId:"pot-classic",quantity:1,
        selections:{size:["small"],flavors:["chocolate"],toppings:[]}}],
    });
    const order=response.data as {publicCode:string};
    expect(order.publicCode).toMatch(/^SV-[A-HJ-NP-Z2-9]{8}$/);
    await expect(getDoc(doc(db,"tenants","tenant-alpha","publicOrderTracking",order.publicCode)))
      .rejects.toMatchObject({code:"permission-denied"});
    const lookup=httpsCallable<{tenantId:string;publicCode:string},{tracking:{
      publicCode:string;status:string;fulfillmentMode:string;timeline:Array<{status:string;at:string}>;
    }|null}>(functions,"getPublicOrderTracking",{timeout:20_000});
    const durations:number[]=[];
    const bounded=async()=>{
      const start=Date.now();
      const result=await lookup({tenantId:"tenant-alpha",publicCode:order.publicCode});
      durations.push(Date.now()-start);
      return result.data.tracking;
    };
    for(let round=0;round<3;round++){
      const results=await Promise.all(Array.from({length:8},()=>bounded()));
      for(const tracking of results){
        expect(tracking).toMatchObject({publicCode:order.publicCode,status:"received",fulfillmentMode:"pickup"});
        expect(tracking).not.toHaveProperty("customer");
        expect(tracking).not.toHaveProperty("address");
        expect(tracking).not.toHaveProperty("deliveryCode");
      }
    }
    expect(durations).toHaveLength(24);
    const cross=await lookup({tenantId:"tenant-beta",publicCode:order.publicCode});
    expect(cross.data.tracking).toBeNull();
    console.info("tracking HTTPS emulator reads:",durations.length,"max latency ms:",Math.max(...durations));
  },120_000);
});

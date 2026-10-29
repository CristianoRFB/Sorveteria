import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from "firebase/functions";

/**
 * F2 diagnostic gate: repeat *actual* customer tracking reads in the Emulator
 * Suite, rather than asserting only that a mock promise resolves. Staging
 * browser QA is still a separate gate.
 */
const projectId = "demo-sorveteria";
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
beforeAll(async () => {
  app = initializeApp({
    apiKey: "demo-api-key",
    authDomain: "localhost",
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:tracking-reliability",
  }, "tracking-reliability-integration");
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, "southamerica-east1");
  connectAuthEmulator(auth, `http://${process.env.SORVETERIA_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}`, {disableWarnings:true});
  const [firestoreHost,firestorePort] = (process.env.SORVETERIA_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088").split(":");
  connectFirestoreEmulator(db,firestoreHost,Number(firestorePort));
  const [functionsHost,functionsPort] = (process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions,functionsHost,Number(functionsPort));
  await signInWithEmailAndPassword(auth,"customer.alpha@demo.sorveteria.test","GelatoDev!2026");
});
afterAll(async () => {
  if (auth?.currentUser) await signOut(auth);
  if (app) await deleteApp(app);
});
describe("public tracking: repeated reads and tenant boundary",() => {
  it("repeated concurrent Firestore reads never hang, leak private fields or cross Alpha/Beta", async () => {
    const requestId = randomUUID();
    const checkout = httpsCallable(functions,"createOrder");
    const order = await checkout({
      tenantId:"tenant-alpha",requestId,fulfillmentMode:"pickup",
      customer:{name:"Tracking load fixture",phone:"11999990000"},
      paymentMethodId:"cash",
      items:[{productId:"pot-classic",quantity:1,selections:{size:["small"],flavors:["chocolate"],toppings:[]}}],
    });
    const data = order.data as {publicCode:string;orderId:string};
    expect(data.publicCode).toMatch(/^SV-[A-HJ-NP-Z2-9]{8}$/);
    const alphaTracking = doc(db,"tenants","tenant-alpha","publicOrderTracking",data.publicCode);
    const durations: number[] = [];
    const bounded = async () => {
      const start=Date.now();
      const deadline = new Promise<never>((_,reject)=>{
        setTimeout(()=>reject(new Error("Tracking read exceeded emulator diagnostic deadline")),20_000);
      });
      // Avoid timing-only claims: assert document content, not just request duration.
      const response = await Promise.race([getDoc(alphaTracking),deadline]);
      durations.push(Date.now()-start);
      return response;
    };
    for (let round=0;round<3;round++) {
      const reads = await Promise.all(Array.from({length:8},()=>bounded()));
      for (const snapshot of reads) {
        expect(snapshot.exists()).toBe(true);
        expect(snapshot.data()).toMatchObject({publicCode:data.publicCode,status:"received",fulfillmentMode:"pickup"});
        expect(snapshot.data()).not.toHaveProperty("customer");
        expect(snapshot.data()).not.toHaveProperty("address");
        expect(snapshot.data()).not.toHaveProperty("deliveryCode");
      }
    }
    expect(durations).toHaveLength(24);
    console.info("tracking emulator reads:",durations.length,"max latency ms:",Math.max(...durations));
    const beta = doc(db,"tenants","tenant-beta","publicOrderTracking",data.publicCode);
    // A code issued by Alpha is never a readable Beta order.
    const cross = await getDoc(beta).then(s=>s.exists(),()=>false);
    expect(cross).toBe(false);
  },120_000);
});

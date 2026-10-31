import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from "firebase/functions";

const require = createRequire(import.meta.url);
const { checkoutDocumentId } = require("../../functions/domain/checkout-idempotency.cjs") as {
  checkoutDocumentId: (tenantId: string, uid: string, requestId: string) => string;
};
const projectId = "demo-sorveteria";
const payload = {
  tenantId: "tenant-alpha",
  fulfillmentMode: "delivery" as const,
  customer: { name: "Concorrência de checkout", phone: "11999990000" },
  address: { street: "Rua de Teste", number: "123", neighborhood: "Centro", reference: "Portão azul" },
  paymentMethodId: "cash",
  items: [{ productId: "pot-classic", quantity: 1, selections: { size: ["small"], flavors: ["chocolate"], toppings: [] } }],
};
type Result = {orderId: string; publicCode: string; deliveryCode: string | null; replayed: boolean};
let app: FirebaseApp;
let admin: AdminApp;
let auth: Auth;
let functions: Functions;
beforeAll(async () => {
  app = initializeApp({
    apiKey: "demo-api-key", authDomain: "localhost", projectId,
    storageBucket: `${projectId}.appspot.com`, messagingSenderId: "000000000000",
    appId: "1:000000000000:web:idempotency",
  }, "idempotency-integration");
  admin = initializeAdminApp({ projectId }, "idempotency-admin");
  auth = getAuth(app);
  functions = getFunctions(app, "southamerica-east1");
  connectAuthEmulator(auth, `http://${process.env.SORVETERIA_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}`, { disableWarnings: true });
  const [host, port] = (process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001").split(":");
  connectFunctionsEmulator(functions, host, Number(port));
  await signInWithEmailAndPassword(auth, "customer.alpha@demo.sorveteria.test", "GelatoDev!2026");
});
afterAll(async () => {
  if (auth?.currentUser) await signOut(auth);
  if (app) await deleteApp(app);
  if (admin) await deleteAdminApp(admin);
});
describe("checkout: concorrência no Emulator Suite", () => {
  it("retém um pedido e um tracking por requestId, sem reexpor o código privado", async () => {
    const userId = auth.currentUser?.uid;
    expect(userId).toBeTruthy();
    const db = getAdminFirestore(admin);
    const orders = db.collection("tenants/tenant-alpha/orders");
    const attempts = db.collection("tenants/tenant-alpha/checkoutRequests");
    const tracking = db.collection("tenants/tenant-alpha/publicOrderTracking");
    const requestId = randomUUID();
    const create = httpsCallable<typeof payload & {requestId: string}, Result>(functions, "createOrder");
    const [a, b] = await Promise.all([
      create({...payload,requestId}),
      create({...payload,requestId}),
    ]);
    expect(a.data.orderId).toBe(b.data.orderId);
    expect(a.data.publicCode).toBe(b.data.publicCode);
    expect([a.data.replayed,b.data.replayed].sort()).toEqual([false,true]);
    expect([a.data.deliveryCode,b.data.deliveryCode].filter(Boolean)).toHaveLength(1);
    const created = await orders.where("customer.name","==",payload.customer.name).count().get();
    expect(created.data().count).toBe(1);
    expect((await tracking.doc(a.data.publicCode).get()).exists).toBe(true);
    const marker = await attempts.doc(checkoutDocumentId("tenant-alpha", userId!, requestId)).get();
    expect(marker.exists).toBe(true);
    expect(marker.data()).toMatchObject({orderId:a.data.orderId,publicCode:a.data.publicCode});
    const replay = await create({...payload,requestId});
    expect(replay.data).toMatchObject({orderId:a.data.orderId,replayed:true,deliveryCode:null});
    await expect(create({...payload,requestId,customer:{...payload.customer,name:"Alterado"}}))
      .rejects.toMatchObject({code:"functions/already-exists"});
    const total = await orders.where("customer.name","==",payload.customer.name).count().get();
    expect(total.data().count).toBe(1);
  }, 120_000);
});

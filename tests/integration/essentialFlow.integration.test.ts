import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp, type App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, where, collection, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from "firebase/functions";

const projectId = "demo-sorveteria";
const password = "GelatoDev!2026";
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let adminApp: AdminApp;

async function signIn(email: string) {
  if (auth.currentUser) await signOut(auth);
  await signInWithEmailAndPassword(auth, email, password);
}

function callable<Input, Output>(name: string) {
  return httpsCallable<Input, Output>(functions, name);
}

beforeAll(() => {
  adminApp = initializeAdminApp({ projectId }, "essential-flow-admin");
  app = initializeApp({
    apiKey: "demo-api-key",
    authDomain: "localhost",
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:integration",
  }, "essential-flow-integration");
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, "southamerica-east1");
  connectAuthEmulator(auth, `http://${process.env.SORVETERIA_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}`, { disableWarnings: true });
  const [firestoreHost, firestorePort] = (process.env.SORVETERIA_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088").split(":");
  const [functionsHost, functionsPort] = (process.env.SORVETERIA_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001").split(":");
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  connectFunctionsEmulator(functions, functionsHost, Number(functionsPort));
});

afterAll(async () => {
  if (auth?.currentUser) await signOut(auth);
  if (app) await deleteApp(app);
  if (adminApp) await deleteAdminApp(adminApp);
});

describe("fluxo essencial em dois tenants", () => {
  it("Platform Owner cria, contextualiza, suspende e reativa tenant com auditoria", async () => {
    await signIn("platform@demo.sorveteria.test");
    const created = await callable<{
      displayName: string;
      slug: string;
    }, { tenantId: string; slug: string; status: string; ownerFound: boolean }>("createTenant")({
      displayName: "Sorveteria Readiness",
      slug: "tenant-readiness",
    });
    expect(created.data).toMatchObject({ slug: "tenant-readiness", status: "onboarding", ownerFound: false });

    // The public resolver must hide onboarding and suspended stores,
    // even when the Platform Owner can read full tenant metadata.
    const publicLookup=async()=> (await callable<{slug:string},{tenant:{id:string;slug:string}|null}>(
      "getPublicTenant")({slug:"tenant-readiness"})).data.tenant;
    expect(await publicLookup()).toBeNull();

    const setStatus = callable<{ tenantId: string; status: "active" | "suspended"; reason: string }, { tenantId: string; status: string }>("setTenantStatus");
    await setStatus({ tenantId: created.data.tenantId, status: "active", reason: "Responsável validado para homologação" });
    const updateSettings = callable<{ tenantId: string; settings: { deliveryFeeCents: number; estimatedMinutes: number; paymentMethods: { id: string; label: string; enabled: boolean }[] } }, { success: boolean }>("updateTenantSettings");
    await expect(updateSettings({
      tenantId: created.data.tenantId,
      settings: { deliveryFeeCents: 0, estimatedMinutes: 30, paymentMethods: [{ id: "cash", label: "Dinheiro", enabled: true }] },
    })).rejects.toMatchObject({ code: "functions/failed-precondition" });
    const assignPlan = callable<{
      tenantId: string; planId: string; subscriptionStatus: string; reason: string;
    }, { unchanged: boolean }>("assignTenantPlan");
    await signIn("owner.alpha@demo.sorveteria.test");
    await expect(assignPlan({ tenantId: created.data.tenantId, planId: "pro", subscriptionStatus: "trial", reason: "Tentativa sem autorização" }))
      .rejects.toMatchObject({ code: "functions/permission-denied" });
    await signIn("platform@demo.sorveteria.test");
    const trial = await assignPlan({ tenantId: created.data.tenantId, planId: "pro", subscriptionStatus: "trial", reason: "Avaliação comercial aprovada" });
    expect(trial.data.unchanged).toBe(false);
    const assignedTenant = await getDoc(doc(db, "tenants", created.data.tenantId));
    expect(assignedTenant.data()).toMatchObject({ planId: "pro", subscriptionStatus: "trial", commercialRevision: 1 });
    const trialUntil = assignedTenant.data()?.trialUntil.toDate().getTime() as number;
    expect(trialUntil).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
    expect(trialUntil).toBeLessThanOrEqual(Date.now() + 14 * 24 * 60 * 60 * 1000 + 1000);
    expect((await assignPlan({ tenantId: created.data.tenantId, planId: "pro", subscriptionStatus: "trial", reason: "Repetição idempotente" })).data.unchanged).toBe(true);
    await assignPlan({ tenantId: created.data.tenantId, planId: "pro", subscriptionStatus: "active", reason: "Fim de cenário de avaliação" });
    await expect(assignPlan({ tenantId: created.data.tenantId, planId: "pro", subscriptionStatus: "trial", reason: "Não deve renovar trial" }))
      .rejects.toMatchObject({ code: "functions/failed-precondition" });
    const entered = await callable<{ tenantId: string }, { tenantId: string; slug: string }>("enterTenantContext")({ tenantId: created.data.tenantId });
    expect(entered.data.slug).toBe("tenant-readiness");
    expect(await publicLookup()).toMatchObject({id:created.data.tenantId,slug:"tenant-readiness"});

    await setStatus({ tenantId: created.data.tenantId, status: "suspended", reason: "Fim do cenário de homologação" });
    expect(await publicLookup()).toBeNull();
    await expect(callable("getPublicCheckoutSettings")({tenantId:created.data.tenantId}))
      .rejects.toMatchObject({code:"functions/not-found"});
    const audit = await getDocs(collection(db, `tenants/${created.data.tenantId}/auditLogs`));
    expect(audit.docs.map((entry) => entry.data().action)).toEqual(expect.arrayContaining([
      "tenant.created", "tenant.reactivated", "tenant.plan_assigned", "tenant.context_entered", "tenant.suspended",
    ]));
    const planAudits = audit.docs.filter((entry) => entry.data().action === "tenant.plan_assigned");
    expect(planAudits).toHaveLength(2);
    const planAudit = planAudits.find((entry) => entry.data().reason === "Avaliação comercial aprovada");
    expect(planAudit).toBeDefined();
    expect(planAudit?.data()).toMatchObject({ reason: "Avaliação comercial aprovada", metadata: { previous: { planId: null, subscriptionStatus: null }, next: { planId: "pro", subscriptionStatus: "trial" } } });

    await signIn("owner.alpha@demo.sorveteria.test");
    await expect(setStatus({ tenantId: created.data.tenantId, status: "active", reason: "Tentativa sem autorização" }))
      .rejects.toMatchObject({ code: "functions/permission-denied" });
  });

  it("aplica limites Essential de equipe e entregadores no backend", async () => {
    await signIn("owner.alpha@demo.sorveteria.test");
    const addMember = callable<{ tenantId: string; email: string; role: string }, { userId: string }>("addTenantMember");
    await expect(addMember({ tenantId: "tenant-alpha", email: "staff.beta@demo.sorveteria.test", role: "staff" }))
      .rejects.toMatchObject({ code: "functions/resource-exhausted" });
    await expect(addMember({ tenantId: "tenant-alpha", email: "driver.beta@demo.sorveteria.test", role: "driver" }))
      .rejects.toMatchObject({ code: "functions/resource-exhausted" });
    // Internal commercial counters are deliberately invisible to client SDKs.
    // Read through Admin SDK only inside this emulator-only integration fixture.
    const counter = await getAdminFirestore(adminApp).doc("tenants/tenant-alpha/commercialMeta/limitCounters").get();
    expect(counter.exists).toBe(false);
  });

  it("resolve tenant, recalcula pedido no servidor e fecha entrega com código single-use", async () => {
    await signIn("customer.alpha@demo.sorveteria.test");

    const publicTenants=await callable<{slug:string},{tenant:{id:string;slug:string}|null}>("getPublicTenant")({slug:"tenant-alpha"});
    expect(publicTenants.data.tenant).toMatchObject({id:"tenant-alpha",slug:"tenant-alpha"});
    await expect(getDoc(doc(db,"tenants/tenant-alpha"))).rejects.toMatchObject({code:"permission-denied"});

    const ownMembership = await getDoc(doc(db, "memberships/tenant-alpha_customer-alpha"));
    expect(ownMembership.data()).toMatchObject({ tenantId: "tenant-alpha", role: "customer", status: "active" });

    const created = await callable<{
      tenantId: string;
      fulfillmentMode: "delivery";
      customer: { name: string; phone: string };
      address: { street: string; number: string; neighborhood: string; reference: string };
      paymentMethodId: string;
      totalCents: number;
      items: Array<{ productId: string; quantity: number; selections: Record<string, string[]>; priceCents: number; lineTotalCents: number }>;
    }, { orderId: string; publicCode: string; deliveryCode: string }>("createOrder")({
      tenantId: "tenant-alpha",
      fulfillmentMode: "delivery",
      customer: { name: "Cliente de Integração", phone: "+55 11 99999-0000" },
      address: { street: "Rua de Teste", number: "123", neighborhood: "Centro", reference: "Portão azul" },
      paymentMethodId: "cash",
      totalCents: 1,
      items: [{
        productId: "pot-classic",
        quantity: 1,
        selections: { size: ["small"], flavors: ["chocolate"], toppings: [] },
        priceCents: 1,
        lineTotalCents: 1,
      }],
    });

    const { orderId, publicCode, deliveryCode } = created.data;
    expect(publicCode).toMatch(/^SV-[A-HJ-NP-Z2-9]{8}$/);
    expect(deliveryCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const orderRef = doc(db, "tenants/tenant-alpha/orders", orderId);
    const orderSnapshot = await getDoc(orderRef);
    expect(orderSnapshot.data()?.money).toEqual({ subtotalCents: 1200, deliveryFeeCents: 500, discountCents: 0, totalCents: 1700 });
    expect(orderSnapshot.data()?.items[0]).toMatchObject({ unitPriceCents: 1200, lineTotalCents: 1200 });

    const trackingRef = doc(db, "tenants/tenant-alpha/publicOrderTracking", publicCode);
    const publicTracking = callable<{tenantId:string;publicCode:string},{tracking:{
      publicCode:string;status:string;fulfillmentMode:string;timeline:Array<{status:string;at:string}>;estimatedMinutes?:number
    }|null}>("getPublicOrderTracking");
    const tracking = (await publicTracking({tenantId:"tenant-alpha",publicCode})).data.tracking;
    expect(tracking).toMatchObject({publicCode,status:"received",fulfillmentMode:"delivery"});
    expect(Object.keys(tracking || {}).sort()).toEqual(["estimatedMinutes", "fulfillmentMode", "publicCode", "status", "timeline"].sort());
    await expect(getDoc(trackingRef)).rejects.toMatchObject({code:"permission-denied"});
    await expect(getDoc(doc(db, "tenants/tenant-alpha/privateDeliveryCodes", orderId))).rejects.toBeDefined();

    await signIn("owner.alpha@demo.sorveteria.test");
    const setOrderStatus = callable<{ tenantId: string; orderId: string; status: string }, { success: boolean }>("updateOrderStatus");
    await setOrderStatus({ tenantId: "tenant-alpha", orderId, status: "confirmed" });
    await setOrderStatus({ tenantId: "tenant-alpha", orderId, status: "preparing" });
    await setOrderStatus({ tenantId: "tenant-alpha", orderId, status: "ready" });
    await callable<{ tenantId: string; orderId: string; driverId: string }, { success: boolean; deliveryId: string }>("assignDelivery")({
      tenantId: "tenant-alpha", orderId, driverId: "driver-alpha",
    });
    await expect(getDoc(doc(db, "tenants/tenant-beta/orders", orderId))).rejects.toBeDefined();

    await signIn("driver.alpha@demo.sorveteria.test");
    const action = callable<{ tenantId: string; deliveryId: string; action: string; deliveryCode?: string }, { success: boolean }>("driverDeliveryAction");
    await action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "start" });
    await action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "arrive" });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "deliver", deliveryCode: "ABCDEFGH" })).rejects.toMatchObject({ code: "functions/permission-denied" });
    }
    await expect(action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "deliver", deliveryCode: "ABCDEFGH" })).rejects.toMatchObject({ code: "functions/resource-exhausted" });

    await signIn("staff.alpha@demo.sorveteria.test");
    const reset = callable<{ tenantId: string; orderId: string; reason: string }, { deliveryCode: string }>("resetDeliveryConfirmationCode");
    await expect(reset({ tenantId: "tenant-alpha", orderId, reason: "Cliente não encontrou o código" })).rejects.toMatchObject({ code: "functions/permission-denied" });

    await signIn("owner.alpha@demo.sorveteria.test");
    const resetResult = await reset({ tenantId: "tenant-alpha", orderId, reason: "Código digitado incorretamente cinco vezes" });
    expect(resetResult.data.deliveryCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const audit = await getDocs(query(
      collection(db, "tenants/tenant-alpha/auditLogs"),
      where("action", "==", "delivery.confirmation_code_reset"),
    ));
    expect(audit.docs.some((entry) => entry.data().reason === "Código digitado incorretamente cinco vezes")).toBe(true);

    await signIn("driver.alpha@demo.sorveteria.test");
    await action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "deliver", deliveryCode: resetResult.data.deliveryCode });
    // Drivers are only allowed to read their scoped HTTPS delivery projection.
    // Raw order and delivery documents may contain private confirmation hashes.
    await expect(getDoc(orderRef)).rejects.toMatchObject({ code: "permission-denied" });
    await expect(getDoc(doc(db, "tenants/tenant-alpha/deliveries", orderId)))
      .rejects.toMatchObject({ code: "permission-denied" });
    const driverSnapshot = await callable<{ tenantId: string }, { deliveries: Array<{
      orderId: string; tenantId: string; driverId: string; status: string;
    }> }>("getDriverAssignments")({ tenantId: "tenant-alpha" });
    expect(driverSnapshot.data.deliveries).toEqual(expect.arrayContaining([
      expect.objectContaining({ orderId, tenantId: "tenant-alpha", driverId: "driver-alpha", status: "delivered" }),
    ]));
    expect(JSON.stringify(driverSnapshot.data)).not.toMatch(/deliveryCodeHash|privateDeliveryCodes|confirmationCode/);
    await expect(action({ tenantId: "tenant-alpha", deliveryId: orderId, action: "deliver", deliveryCode: resetResult.data.deliveryCode })).rejects.toMatchObject({ code: "functions/failed-precondition" });
    await signIn("owner.alpha@demo.sorveteria.test");
    const deliveredOrder = await getDoc(orderRef);
    expect(deliveredOrder.data()?.status).toBe("delivered");
    const deliveredTracking=(await publicTracking({tenantId:"tenant-alpha",publicCode})).data.tracking;
    expect(deliveredTracking?.status).toBe("delivered");
    expect(deliveredTracking).not.toHaveProperty("customer");
    expect(deliveredTracking).not.toHaveProperty("address");
  });
});

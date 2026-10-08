import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, query, where, orderBy, limit } from "firebase/firestore";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

const projectId = "demo-sorveteria";
let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8088 },
    storage: { rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"), host: "127.0.0.1", port: 9415 },
  });
});

beforeEach(async () => {
  await testEnv!.clearFirestore();
  await testEnv!.clearStorage();
  await testEnv!.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, "tenants/tenant-alpha"), { slug: "tenant-alpha", status: "active", branding: { displayName: "Alpha" } }),
      setDoc(doc(firestore, "tenants/tenant-beta"), { slug: "tenant-beta", status: "active", branding: { displayName: "Beta" } }),
      setDoc(doc(firestore, "tenants/tenant-suspended"), { slug: "tenant-suspended", status: "suspended", branding: { displayName: "Suspensa" } }),
      setDoc(doc(firestore, "memberships/tenant-alpha_owner-alpha"), { tenantId: "tenant-alpha", userId: "owner-alpha", role: "tenant_owner", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-beta_owner-beta"), { tenantId: "tenant-beta", userId: "owner-beta", role: "tenant_owner", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-alpha_staff-alpha"), { tenantId: "tenant-alpha", userId: "staff-alpha", role: "staff", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-beta_staff-beta"), { tenantId: "tenant-beta", userId: "staff-beta", role: "staff", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-alpha_customer-alpha"), { tenantId: "tenant-alpha", userId: "customer-alpha", role: "customer", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-alpha_driver-alpha"), { tenantId: "tenant-alpha", userId: "driver-alpha", role: "driver", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-beta_driver-beta"), { tenantId: "tenant-beta", userId: "driver-beta", role: "driver", status: "active" }),
      setDoc(doc(firestore, "memberships/tenant-alpha_inactive-user"), { tenantId: "tenant-alpha", userId: "inactive-user", role: "tenant_admin", status: "inactive" }),
      setDoc(doc(firestore, "tenants/tenant-alpha/categories/gelatos"), { name: "Gelatos", active: true, sortOrder: 0 }),
      setDoc(doc(firestore, "tenants/tenant-alpha/products/pot"), { name: "Pote", categoryId: "gelatos", priceCents: 1000, available: true }),
      setDoc(doc(firestore, "tenants/tenant-alpha/orders/order-alpha"), { tenantId: "tenant-alpha", customerId: "customer-alpha", status: "received", createdAt: new Date(), money: { totalCents: 1000 } }),
      setDoc(doc(firestore, "tenants/tenant-beta/orders/order-beta"), { tenantId: "tenant-beta", customerId: "customer-beta", status: "received", createdAt: new Date(), money: { totalCents: 2000 } }),
      setDoc(doc(firestore, "tenants/tenant-alpha/publicOrderTracking/SV-ABCDEFG2"), { publicCode: "SV-ABCDEFG2", status: "received", timeline: [], fulfillmentMode: "pickup" }),
      setDoc(doc(firestore, "tenants/tenant-alpha/deliveries/order-alpha"), { tenantId: "tenant-alpha", orderId: "order-alpha", driverId: "driver-alpha", status: "assigned", failedAttempts: 0 }),
      setDoc(doc(firestore, "tenants/tenant-beta/deliveries/order-beta"), { tenantId: "tenant-beta", orderId: "order-beta", driverId: "driver-beta", status: "assigned", failedAttempts: 0 }),
      setDoc(doc(firestore, "tenants/tenant-alpha/privateDeliveryCodes/order-alpha"), { hash: "secret-hash" }),
      setDoc(doc(firestore, "tenants/tenant-alpha/auditLogs/audit-1"), { action: "order.status_changed", actorId: "owner-alpha" }),
      setDoc(doc(firestore, "tenants/tenant-alpha/settings/main"), { deliveryFeeCents: 500, paymentMethods: [] }),
    ]);
  });
});

afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

const signed = (uid: string, claims: Record<string, unknown> = {}) => testEnv!.authenticatedContext(uid, claims).firestore();

describe("Firestore Rules — tenant isolation", () => {
  it("permite ao Platform Owner ler ambos os tenants, mas não criar pedido direto pelo navegador", async () => {
    const db = signed("platform-owner", { platform_owner: true });
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha")));
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-beta")));
    await assertSucceeds(getDocs(query(collection(db, "tenants"), where("status", "==", "active"))));
    await assertFails(setDoc(doc(db, "tenants/tenant-alpha/orders/direct"), { status: "received", money: { totalCents: 1 } }));
  });

  it("mantém owner-alpha restrito aos dados privados do tenant-alpha", async () => {
    const db = signed("owner-alpha");
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha")));
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha/orders/order-alpha")));
    await assertSucceeds(getDocs(query(collection(db, "tenants/tenant-alpha/orders"), orderBy("createdAt", "desc"), limit(100))));
    await assertFails(getDoc(doc(db, "tenants/tenant-beta/orders/order-beta")));
    await assertFails(getDocs(query(collection(db, "tenants/tenant-beta/orders"), orderBy("createdAt", "desc"), limit(100))));
    await assertFails(getDoc(doc(db, "tenants/tenant-beta/deliveries/order-beta")));
    await assertFails(setDoc(doc(db, "tenants/tenant-beta/categories/steal"), { name: "Invasão", active: true, sortOrder: 1 }));
  });

  it("permite ao owner-beta ler somente seus próprios registros privados", async () => {
    const db = signed("owner-beta");
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-beta/orders/order-beta")));
    await assertFails(getDoc(doc(db, "tenants/tenant-alpha/orders/order-alpha")));
  });

  it("restringe staff às áreas operacionais do próprio tenant", async () => {
    const alpha = signed("staff-alpha");
    const beta = signed("staff-beta");
    await assertSucceeds(getDoc(doc(alpha, "tenants/tenant-alpha")));
    await assertSucceeds(getDoc(doc(alpha, "tenants/tenant-alpha/categories/gelatos")));
    await assertSucceeds(getDoc(doc(alpha, "tenants/tenant-alpha/products/pot")));
    await assertSucceeds(getDoc(doc(alpha, "tenants/tenant-alpha/orders/order-alpha")));
    await assertSucceeds(getDocs(query(collection(alpha, "tenants/tenant-alpha/orders"), orderBy("createdAt", "desc"), limit(100))));
    await assertFails(getDoc(doc(alpha, "tenants/tenant-beta/orders/order-beta")));
    await assertFails(getDocs(query(collection(alpha, "tenants/tenant-beta/orders"), orderBy("createdAt", "desc"), limit(100))));
    await assertFails(getDoc(doc(alpha, "tenants/tenant-alpha/auditLogs/audit-1")));
    await assertFails(setDoc(doc(alpha, "tenants/tenant-alpha/categories/new"), { name: "Nova", active: true, sortOrder: 2 }));
    await assertSucceeds(getDoc(doc(beta, "tenants/tenant-beta/orders/order-beta")));
    await assertFails(getDoc(doc(beta, "tenants/tenant-alpha/orders/order-alpha")));
  });

  it("permite resolver membership ausente do próprio UID sem ler membership de outra pessoa", async () => {
    const db = signed("owner-beta");
    const missing = await assertSucceeds(getDoc(doc(db, "memberships/tenant-alpha_owner-beta")));
    expect(missing.exists()).toBe(false);
    await assertFails(getDoc(doc(db, "memberships/tenant-alpha_owner-alpha")));
  });

  it("cliente não altera role, preço, status, totais ou campos privilegiados", async () => {
    const db = signed("customer-alpha");
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha/orders/order-alpha")));
    await assertFails(updateDoc(doc(db, "memberships/tenant-alpha_customer-alpha"), { role: "platform_owner" }));
    await assertFails(updateDoc(doc(db, "tenants/tenant-alpha/orders/order-alpha"), { status: "delivered", money: { totalCents: 1 } }));
    await assertFails(setDoc(doc(db, "tenants/tenant-alpha/orders/fake"), { tenantId: "tenant-alpha", status: "delivered", money: { totalCents: 1 } }));
    await assertFails(getDoc(doc(db, "tenants/tenant-beta/orders/order-beta")));
    await assertFails(getDoc(doc(db, "tenants/tenant-alpha/privateDeliveryCodes/order-alpha")));
  });

  it("driver vê somente entrega atribuída e não muda o driverId nem o estado diretamente", async () => {
    const db = signed("driver-alpha");
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha/deliveries/order-alpha")));
    await assertSucceeds(getDoc(doc(db, "tenants/tenant-alpha/orders/order-alpha")));
    await assertFails(getDoc(doc(db, "tenants/tenant-beta/deliveries/order-beta")));
    await assertFails(updateDoc(doc(db, "tenants/tenant-alpha/deliveries/order-alpha"), { driverId: "driver-beta", status: "delivered" }));
  });

  it("bloqueia membership inativa e acesso público a tenant suspenso", async () => {
    const inactive = signed("inactive-user");
    await assertSucceeds(getDoc(doc(inactive, "memberships/tenant-alpha_inactive-user")));
    await assertFails(getDoc(doc(inactive, "tenants/tenant-alpha/orders/order-alpha")));
    const anonymous = testEnv!.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymous, "tenants/tenant-suspended")));
    await assertFails(getDoc(doc(anonymous, "tenants/tenant-suspended/publicOrderTracking/SV-ABCDEFG2")));
  });

  it("expõe apenas a projeção de tracking por get e impede listagem e escrita", async () => {
    const anonymous = testEnv!.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonymous, "tenants/tenant-alpha/publicOrderTracking/SV-ABCDEFG2")));
    await assertFails(getDocs(collection(anonymous, "tenants/tenant-alpha/publicOrderTracking")));
    await assertFails(setDoc(doc(anonymous, "tenants/tenant-alpha/publicOrderTracking/SV-ABCDEFG3"), { publicCode: "SV-ABCDEFG3", status: "delivered" }));
  });

  it("mantém audit logs somente de leitura para perfis administrativos", async () => {
    await assertSucceeds(getDoc(doc(signed("owner-alpha"), "tenants/tenant-alpha/auditLogs/audit-1")));
    await assertFails(getDoc(doc(signed("customer-alpha"), "tenants/tenant-alpha/auditLogs/audit-1")));
    await assertFails(setDoc(doc(signed("owner-alpha"), "tenants/tenant-alpha/auditLogs/fake"), { action: "tenant.suspended" }));
  });
});

describe("Storage Rules — tenant-aware paths", () => {
  it("permite somente escrita de asset público no tenant próprio e leitura pública do path explícito", async () => {
    const storage = testEnv!.authenticatedContext("owner-alpha").storage();
    const alphaRef = storage.ref("tenants/tenant-alpha/public/branding/logo.png");
    const upload = (ref: ReturnType<typeof storage.ref>, contentType: string) => new Promise<void>((resolve, reject) => {
      ref.putString("aGVsbG8=", "base64", { contentType }).on("state_changed", undefined, reject, () => resolve());
    });
    await assertSucceeds(upload(alphaRef, "image/png"));
    const anonymous = testEnv!.unauthenticatedContext().storage();
    await assertSucceeds(anonymous.ref("tenants/tenant-alpha/public/branding/logo.png").getMetadata());
    await assertFails(upload(storage.ref("tenants/tenant-beta/public/branding/logo.png"), "image/png"));
    await assertSucceeds(upload(storage.ref("tenants/tenant-alpha/private/export.csv"), "text/csv"));
    const customerStorage = testEnv!.authenticatedContext("customer-alpha").storage();
    await assertFails(upload(customerStorage.ref("tenants/tenant-alpha/private/export.csv"), "text/csv"));
    await assertFails(anonymous.ref("tenants/tenant-alpha/private/export.csv").getMetadata());
  });
});

import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const expectedProjectId = "demo-sorveteria";
const authEmulatorHost = process.env.SORVETERIA_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const firestoreEmulatorHost = process.env.SORVETERIA_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088";
if (process.env.GCLOUD_PROJECT !== expectedProjectId
  || process.env.FIREBASE_AUTH_EMULATOR_HOST !== authEmulatorHost
  || process.env.FIRESTORE_EMULATOR_HOST !== firestoreEmulatorHost) {
  throw new Error("Seed recusado: execute dentro dos emuladores do projeto demo-sorveteria.");
}

const app = initializeApp({ projectId: expectedProjectId }, "sorveteria-emulator-seed");
const auth = getAuth(app);
const db = getFirestore(app);
const password = "GelatoDev!2026";

const accounts = [
  { uid: "platform-owner", email: "platform@demo.sorveteria.test", displayName: "Platform Owner", platform: true },
  { uid: "owner-alpha", email: "owner.alpha@demo.sorveteria.test", displayName: "Responsável Alpha" },
  { uid: "owner-beta", email: "owner.beta@demo.sorveteria.test", displayName: "Responsável Beta" },
  { uid: "staff-alpha", email: "staff.alpha@demo.sorveteria.test", displayName: "Equipe Alpha" },
  { uid: "staff-beta", email: "staff.beta@demo.sorveteria.test", displayName: "Equipe Beta" },
  { uid: "driver-alpha", email: "driver.alpha@demo.sorveteria.test", displayName: "Entregador Alpha" },
  { uid: "driver-beta", email: "driver.beta@demo.sorveteria.test", displayName: "Entregador Beta" },
  { uid: "customer-alpha", email: "customer.alpha@demo.sorveteria.test", displayName: "Cliente Alpha" },
  { uid: "customer-beta", email: "customer.beta@demo.sorveteria.test", displayName: "Cliente Beta" },
];

for (const account of accounts) {
  try {
    await auth.getUser(account.uid);
    await auth.updateUser(account.uid, { email: account.email, password, displayName: account.displayName, disabled: false });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    await auth.createUser({ uid: account.uid, email: account.email, password, displayName: account.displayName });
  }
  await auth.setCustomUserClaims(account.uid, account.platform ? { platform_owner: true } : {});
  await db.doc(`users/${account.uid}`).set({ displayName: account.displayName, email: account.email, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
}

const option = (id, name, priceDeltaCents = 0) => ({ id, name, priceDeltaCents, available: true });
const group = (id, name, required, minSelections, maxSelections, options) => ({ id, name, required, minSelections, maxSelections, options });
const productTemplates = [
  {
    id: "pot-classic", name: "Monte seu pote", description: "Escolha o tamanho, combine sabores e finalize com adicionais.", categoryId: "gelatos",
    kind: "pot", priceCents: 1200, available: true, optionGroups: [
      group("size", "Tamanho", true, 1, 1, [option("small", "Pequeno", 0), option("medium", "Médio", 500), option("large", "Grande", 1000)]),
      group("flavors", "Sabores", true, 1, 3, [option("chocolate", "Chocolate"), option("strawberry", "Morango"), option("cream", "Creme"), option("cookies", "Cookies")]),
      group("toppings", "Coberturas e adicionais", false, 0, 3, [option("sprinkles", "Granulado", 200), option("syrup", "Calda", 250), option("nuts", "Castanhas", 350)]),
    ],
  },
  {
    id: "cone-classic", name: "Casquinha", description: "Escolha quantas bolas e seus sabores favoritos.", categoryId: "gelatos",
    kind: "cone", priceCents: 800, available: true, optionGroups: [
      group("balls", "Quantidade de bolas", true, 1, 1, [option("one-ball", "1 bola", 0), option("two-balls", "2 bolas", 450), option("three-balls", "3 bolas", 850)]),
      group("flavors", "Sabores", true, 1, 3, [option("chocolate", "Chocolate"), option("strawberry", "Morango"), option("cream", "Creme"), option("cookies", "Cookies")]),
      group("extras", "Adicionais", false, 0, 2, [option("sprinkles", "Granulado", 200), option("syrup", "Calda", 250)]),
    ],
  },
  {
    id: "milkshake-classic", name: "Milk-shake", description: "Bebida cremosa feita com seu sabor preferido.", categoryId: "bebidas",
    kind: "milkshake", priceCents: 1500, available: true, optionGroups: [
      group("size", "Tamanho", true, 1, 1, [option("medium", "Médio", 0), option("large", "Grande", 600)]),
      group("flavor", "Sabor", true, 1, 1, [option("chocolate", "Chocolate"), option("strawberry", "Morango"), option("cookies", "Cookies")]),
      group("extras", "Adicionais", false, 0, 2, [option("whipped-cream", "Chantilly", 300), option("syrup", "Calda", 250)]),
    ],
  },
];

const memberships = [
  ["owner-alpha", "tenant-alpha", "tenant_owner"], ["owner-beta", "tenant-beta", "tenant_owner"],
  ["staff-alpha", "tenant-alpha", "staff"], ["staff-beta", "tenant-beta", "staff"],
  ["driver-alpha", "tenant-alpha", "driver"], ["driver-beta", "tenant-beta", "driver"],
  ["customer-alpha", "tenant-alpha", "customer"], ["customer-beta", "tenant-beta", "customer"],
];

for (const [tenantId, slug, name] of [["tenant-alpha", "tenant-alpha", "Sorveteria Alpha"], ["tenant-beta", "tenant-beta", "Sorveteria Beta"]]) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  await tenantRef.set({
    slug, status: "active",
    branding: { displayName: name, primaryColor: "#6d28d9", secondaryColor: "#f1e9ff", backgroundColor: "#fffaf3", textColor: "#201a2a", borderRadius: "md" },
    contact: { phone: "+55 11 4000-0000", address: "Rua de demonstração, 100" },
    features: { onlineMenu: true, pickup: true, delivery: true, qrCodes: true, tableOrdering: false, kds: false, cashRegister: false, finance: false, coupons: false, inventory: false },
    planId: "essencial", subscriptionStatus: "active", entitlementOverrides: {}, limitOverrides: {}, commercialRevision: 1,
    commercialUpdatedAt: Timestamp.now(), commercialAssignedBy: "local-emulator-fixture",
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  }, { merge: true });
  await db.doc(`tenantSlugs/${slug}`).set({ tenantId, createdAt: Timestamp.now() });
  await tenantRef.collection("settings").doc("main").set({
    deliveryFeeCents: 500, estimatedMinutes: 35,
    paymentMethods: [
      { id: "pix_manual", label: "Pix", instructions: "A chave será informada pela loja após a confirmação.", enabled: true },
      { id: "cash", label: "Dinheiro", instructions: "Pagamento na retirada ou entrega.", enabled: true },
      { id: "card_at_delivery", label: "Cartão na entrega/retirada", enabled: true },
    ], updatedAt: Timestamp.now(),
  });
  await tenantRef.collection("categories").doc("gelatos").set({ name: "Gelatos", active: true, sortOrder: 0, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  await tenantRef.collection("categories").doc("bebidas").set({ name: "Bebidas", active: true, sortOrder: 1, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  for (const template of productTemplates) {
    await tenantRef.collection("products").doc(template.id).set({ ...template, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
}

for (const [uid, tenantId, role] of memberships) {
  await db.doc(`memberships/${tenantId}_${uid}`).set({ tenantId, userId: uid, role, status: "active", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
}

await deleteApp(app);
console.log(`Emulator preparado: ${accounts.length} contas, 2 sorveterias e ${productTemplates.length} produtos em cada cardápio.`);

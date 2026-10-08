const { randomBytes, timingSafeEqual } = require("node:crypto");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { canTransitionDelivery, codeFromBytes, deliveryCodeHash, isDeliveryCodeValid } = require("./domain/delivery.cjs");

if (!getApps().length) initializeApp();
const db = getFirestore();
const REGION = "southamerica-east1";
const ADMIN_ROLES = new Set(["tenant_owner", "tenant_admin", "staff", "cashier"]);

function fail(code, message) {
  throw new HttpsError(code, message);
}

function requireAuth(request) {
  if (!request.auth) fail("unauthenticated", "Entre para continuar.");
  return request.auth;
}

function requirePlatformOwner(request) {
  const auth = requireAuth(request);
  if (auth.token.platform_owner !== true) fail("permission-denied", "Ação restrita ao Platform Owner.");
  return auth;
}

async function readActiveMembership(transaction, tenantId, uid) {
  const membershipRef = db.doc(`memberships/${tenantId}_${uid}`);
  const snapshot = await transaction.get(membershipRef);
  const membership = snapshot.exists ? snapshot.data() : null;
  if (!membership || membership.status !== "active") fail("permission-denied", "Vínculo ativo com a sorveteria não encontrado.");
  return { ref: membershipRef, data: membership };
}

async function requireTenantAdmin(transaction, tenantId, auth) {
  if (auth.token.platform_owner === true) return null;
  const membership = await readActiveMembership(transaction, tenantId, auth.uid);
  if (!ADMIN_ROLES.has(membership.data.role)) fail("permission-denied", "Seu perfil não pode executar esta ação.");
  return membership;
}

async function requireTenantManager(transaction, tenantId, auth) {
  if (auth.token.platform_owner === true) return null;
  const membership = await readActiveMembership(transaction, tenantId, auth.uid);
  if (!["tenant_owner", "tenant_admin"].includes(membership.data.role)) fail("permission-denied", "Apenas o responsável ou administrador pode alterar esta configuração.");
  return membership;
}

function requireText(value, label, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    fail("invalid-argument", `${label} inválido.`);
  }
  return value.trim();
}

function generatedCode(prefix = "") {
  return codeFromBytes(randomBytes(8), prefix);
}

function hasOnlyKeys(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => allowed.includes(key));
}

function validateAddress(address) {
  if (!hasOnlyKeys(address, ["street", "number", "neighborhood", "reference"])) fail("invalid-argument", "Endereço inválido.");
  return {
    street: requireText(address.street, "Rua", 160),
    number: requireText(address.number, "Número", 32),
    neighborhood: requireText(address.neighborhood, "Bairro", 100),
    reference: typeof address.reference === "string" ? address.reference.trim().slice(0, 180) : "",
  };
}

function validateCatalogProduct(input) {
  if (!hasOnlyKeys(input, ["name", "description", "categoryId", "kind", "priceCents", "available", "optionGroups", "imageUrl"])) {
    fail("invalid-argument", "Dados do produto inválidos.");
  }
  const name = requireText(input.name, "Nome do produto", 120);
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 1000) : "";
  const categoryId = requireText(input.categoryId, "Categoria", 128);
  if (!["pot", "cone", "milkshake", "other"].includes(input.kind)) fail("invalid-argument", "Tipo de produto inválido.");
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 1000000) fail("invalid-argument", "Preço inválido.");
  if (typeof input.available !== "boolean") fail("invalid-argument", "Disponibilidade inválida.");
  if (!Array.isArray(input.optionGroups) || input.optionGroups.length > 20) fail("invalid-argument", "Grupos de opções inválidos.");
  const seenGroupIds = new Set();
  const optionGroups = input.optionGroups.map((group) => {
    if (!hasOnlyKeys(group, ["id", "name", "required", "minSelections", "maxSelections", "options"])) fail("invalid-argument", "Grupo de opções inválido.");
    const id = requireText(group.id, "Grupo", 64);
    const groupName = requireText(group.name, "Nome do grupo", 80);
    if (seenGroupIds.has(id) || typeof group.required !== "boolean" || !Number.isInteger(group.minSelections)
      || !Number.isInteger(group.maxSelections) || group.minSelections < 0 || group.minSelections > group.maxSelections
      || group.maxSelections > 20 || !Array.isArray(group.options) || group.options.length > 100
      || group.maxSelections > group.options.length || (group.required && group.minSelections < 1)) {
      fail("invalid-argument", `Regras inválidas no grupo ${groupName}.`);
    }
    seenGroupIds.add(id);
    const seenOptionIds = new Set();
    const options = group.options.map((option) => {
      if (!hasOnlyKeys(option, ["id", "name", "priceDeltaCents", "available"])) fail("invalid-argument", `Opção inválida em ${groupName}.`);
      const optionId = requireText(option.id, "Opção", 64);
      const optionName = requireText(option.name, "Nome da opção", 80);
      if (seenOptionIds.has(optionId) || !Number.isInteger(option.priceDeltaCents) || option.priceDeltaCents < 0
        || option.priceDeltaCents > 100000 || typeof option.available !== "boolean") fail("invalid-argument", `Opção inválida em ${groupName}.`);
      seenOptionIds.add(optionId);
      return { id: optionId, name: optionName, priceDeltaCents: option.priceDeltaCents, available: option.available };
    });
    return { id, name: groupName, required: group.required, minSelections: group.minSelections, maxSelections: group.maxSelections, options };
  });
  const imageUrl = typeof input.imageUrl === "string" && input.imageUrl ? input.imageUrl : null;
  if (imageUrl && !/^https:\/\//.test(imageUrl)) fail("invalid-argument", "A imagem precisa usar HTTPS.");
  return { name, description, categoryId, kind: input.kind, priceCents: input.priceCents, available: input.available, optionGroups, ...(imageUrl ? { imageUrl } : {}) };
}

function resolveSelections(product, selections) {
  if (!Number.isInteger(product.priceCents) || product.priceCents < 0) fail("failed-precondition", "O preço de um produto está inválido.");
  if (!Array.isArray(product.optionGroups) || product.optionGroups.length > 20) fail("failed-precondition", "As opções de um produto estão inválidas.");
  if (!hasOnlyKeys(selections || {}, (product.optionGroups || []).map((group) => group.id))) {
    fail("invalid-argument", "Opções de produto inválidas.");
  }
  let extra = 0;
  const normalized = {};
  const seenGroupIds = new Set();
  for (const group of product.optionGroups || []) {
    if (!group || typeof group.id !== "string" || !group.id || seenGroupIds.has(group.id)
      || !Number.isInteger(group.minSelections) || !Number.isInteger(group.maxSelections)
      || group.minSelections < 0 || group.minSelections > group.maxSelections || group.maxSelections > 20
      || !Array.isArray(group.options) || group.options.length > 100 || group.maxSelections > group.options.length
      || (group.required === true && group.minSelections < 1)) fail("failed-precondition", "As opções de um produto estão inválidas.");
    seenGroupIds.add(group.id);
    const chosen = selections?.[group.id] || [];
    if (!Array.isArray(chosen) || chosen.some((id) => typeof id !== "string") || new Set(chosen).size !== chosen.length) {
      fail("invalid-argument", `Seleção inválida em ${group.name}.`);
    }
    if (chosen.length < group.minSelections || chosen.length > group.maxSelections) {
      fail("invalid-argument", `Quantidade de escolhas inválida em ${group.name}.`);
    }
    const available = new Map((group.options || []).filter((option) => option && option.available === true
      && typeof option.id === "string" && Number.isInteger(option.priceDeltaCents) && option.priceDeltaCents >= 0)
      .map((option) => [option.id, option]));
    for (const id of chosen) {
      const option = available.get(id);
      if (!option) fail("failed-precondition", `Uma opção de ${group.name} não está disponível.`);
      extra += option.priceDeltaCents;
    }
    normalized[group.id] = chosen;
  }
  return { selections: normalized, priceCents: product.priceCents + extra };
}

function canTransition(current, next, fulfillment) {
  const transitions = {
    received: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["awaiting_driver", "ready_for_pickup", "cancelled"],
    awaiting_driver: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    ready_for_pickup: ["picked_up", "cancelled"],
    delivered: [], picked_up: [], cancelled: [],
  };
  if (!transitions[current]?.includes(next)) return false;
  if (["awaiting_driver", "out_for_delivery", "delivered"].includes(next)) return fulfillment === "delivery";
  if (["ready_for_pickup", "picked_up"].includes(next)) return fulfillment === "pickup";
  return true;
}

function auditRecord({ tenantId, actorId, actorRole, action, entityType, entityId, reason, metadata }) {
  return {
    tenantId,
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    reason: reason || null,
    metadata: metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  };
}

exports.createTenant = onCall({ region: REGION }, async (request) => {
  const auth = requirePlatformOwner(request);
  const displayName = requireText(request.data?.displayName, "Nome", 120);
  const slug = requireText(request.data?.slug, "Slug", 64);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail("invalid-argument", "Slug inválido.");
  const ownerEmail = typeof request.data?.ownerEmail === "string" ? request.data.ownerEmail.trim().toLowerCase() : "";
  let owner = null;
  if (ownerEmail) {
    try { owner = await getAuth().getUserByEmail(ownerEmail); }
    catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  }

  const tenantRef = db.collection("tenants").doc();
  const slugRef = db.doc(`tenantSlugs/${slug}`);
  const tenant = {
    slug,
    status: owner ? "active" : "onboarding",
    branding: {
      displayName,
      primaryColor: "#6d28d9",
      secondaryColor: "#f1e9ff",
      backgroundColor: "#fffaf3",
      textColor: "#201a2a",
      borderRadius: "md",
    },
    features: { onlineMenu: true, pickup: true, delivery: true, qrCodes: true, tableOrdering: false, kds: false, cashRegister: false, finance: false, coupons: false, inventory: false },
    contact: {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (transaction) => {
    const slugSnapshot = await transaction.get(slugRef);
    if (slugSnapshot.exists) fail("already-exists", "Já existe uma sorveteria com esse endereço.");
    transaction.create(slugRef, { tenantId: tenantRef.id, createdAt: FieldValue.serverTimestamp() });
    transaction.create(tenantRef, tenant);
    if (owner) transaction.create(db.doc(`memberships/${tenantRef.id}_${owner.uid}`), {
      tenantId: tenantRef.id, userId: owner.uid, role: "tenant_owner", status: "active", createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(tenantRef.collection("settings").doc("main"), {
      deliveryFeeCents: 0,
      estimatedMinutes: 30,
      paymentMethods: [
        { id: "pix_manual", label: "Pix", instructions: "A combinar com a loja", enabled: true },
        { id: "cash", label: "Dinheiro", enabled: true },
        { id: "card_at_delivery", label: "Cartão na entrega/retirada", enabled: true },
      ],
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId: tenantRef.id, actorId: auth.uid, actorRole: "platform_owner", action: "tenant.created",
      entityType: "tenant", entityId: tenantRef.id, metadata: { slug, ownerUid: owner?.uid || null },
    }));
  });
  return { tenantId: tenantRef.id, slug, status: tenant.status, ownerFound: Boolean(owner) };
});

exports.setTenantStatus = onCall({ region: REGION }, async (request) => {
  const auth = requirePlatformOwner(request);
  const tenantId = requireText(request.data?.tenantId, "Tenant", 128);
  const status = request.data?.status;
  const reason = requireText(request.data?.reason, "Motivo", 500);
  if (!["active", "suspended"].includes(status)) fail("invalid-argument", "Status inválido.");
  const tenantRef = db.doc(`tenants/${tenantId}`);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    if (!tenantSnapshot.exists) fail("not-found", "Sorveteria não encontrada.");
    const previous = tenantSnapshot.data().status;
    transaction.update(tenantRef, { status, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: "platform_owner", action: status === "suspended" ? "tenant.suspended" : "tenant.reactivated",
      entityType: "tenant", entityId: tenantId, reason, metadata: { previous, status },
    }));
  });
  return { tenantId, status };
});

exports.enterTenantContext = onCall({ region: REGION }, async (request) => {
  const auth = requirePlatformOwner(request);
  const tenantId = requireText(request.data?.tenantId, "Tenant", 128);
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const tenant = await tenantRef.get();
  if (!tenant.exists) fail("not-found", "Sorveteria não encontrada.");
  await tenantRef.collection("auditLogs").add(auditRecord({
    tenantId, actorId: auth.uid, actorRole: "platform_owner", action: "tenant.context_entered",
    entityType: "tenant", entityId: tenantId, metadata: { slug: tenant.data().slug },
  }));
  return { tenantId, slug: tenant.data().slug };
});

exports.updateTenantSettings = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Tenant", 128);
  const settings = request.data?.settings;
  if (!hasOnlyKeys(settings, ["deliveryFeeCents", "estimatedMinutes", "paymentMethods"])) fail("invalid-argument", "Configuração inválida.");
  if (!Number.isInteger(settings.deliveryFeeCents) || settings.deliveryFeeCents < 0 || settings.deliveryFeeCents > 100000) fail("invalid-argument", "Taxa de entrega inválida.");
  if (!Number.isInteger(settings.estimatedMinutes) || settings.estimatedMinutes < 1 || settings.estimatedMinutes > 600) fail("invalid-argument", "Estimativa inválida.");
  if (!Array.isArray(settings.paymentMethods) || settings.paymentMethods.length < 1 || settings.paymentMethods.length > 8) fail("invalid-argument", "Formas de pagamento inválidas.");
  for (const method of settings.paymentMethods) {
    if (!hasOnlyKeys(method, ["id", "label", "instructions", "enabled"]) || !/^[a-z0-9_-]{2,40}$/.test(method.id)
      || typeof method.label !== "string" || !method.label.trim() || method.label.length > 60
      || typeof method.enabled !== "boolean") fail("invalid-argument", "Forma de pagamento inválida.");
  }
  const tenantRef = db.doc(`tenants/${tenantId}`);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    if (!tenantSnapshot.exists) fail("not-found", "Sorveteria não encontrada.");
    const membership = await requireTenantManager(transaction, tenantId, auth);
    if (tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa.");
    transaction.set(tenantRef.collection("settings").doc("main"), { ...settings, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: membership?.data.role || "platform_owner", action: "tenant.updated", entityType: "tenant_settings", metadata: { changed: Object.keys(settings) },
    }));
  });
  return { success: true };
});

exports.saveCatalogCategory = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const name = requireText(request.data?.category?.name, "Categoria", 80);
  const active = request.data?.category?.active;
  const sortOrder = request.data?.category?.sortOrder;
  const categoryId = request.data?.categoryId ? requireText(request.data.categoryId, "Categoria", 128) : null;
  if (typeof active !== "boolean" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fail("invalid-argument", "Dados da categoria inválidos.");
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const categoryRef = categoryId ? tenantRef.collection("categories").doc(categoryId) : tenantRef.collection("categories").doc();
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const previous = categoryId ? await transaction.get(categoryRef) : null;
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    const membership = await requireTenantManager(transaction, tenantId, auth);
    if (categoryId && !previous.exists) fail("not-found", "Categoria não encontrada.");
    const value = { name, active, sortOrder, ...(previous?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }), updatedAt: FieldValue.serverTimestamp() };
    if (previous?.exists) transaction.update(categoryRef, value);
    else transaction.create(categoryRef, value);
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: membership?.data.role || "platform_owner", action: "category.updated",
      entityType: "category", entityId: categoryRef.id, metadata: { name, active, sortOrder, created: !previous?.exists },
    }));
  });
  return { id: categoryRef.id };
});

exports.saveCatalogProduct = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const product = validateCatalogProduct(request.data?.product);
  const productId = request.data?.productId ? requireText(request.data.productId, "Produto", 128) : null;
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const productRef = productId ? tenantRef.collection("products").doc(productId) : tenantRef.collection("products").doc();
  const categoryRef = tenantRef.collection("categories").doc(product.categoryId);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const categorySnapshot = await transaction.get(categoryRef);
    const previous = productId ? await transaction.get(productRef) : null;
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    const membership = await requireTenantManager(transaction, tenantId, auth);
    if (!categorySnapshot.exists || categorySnapshot.data().active !== true) fail("failed-precondition", "Escolha uma categoria ativa.");
    if (productId && !previous.exists) fail("not-found", "Produto não encontrado.");
    const value = { ...product, ...(previous?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }), updatedAt: FieldValue.serverTimestamp() };
    if (previous?.exists) transaction.update(productRef, value);
    else transaction.create(productRef, value);
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: membership?.data.role || "platform_owner", action: "product.updated",
      entityType: "product", entityId: productRef.id, metadata: { name: product.name, priceCents: product.priceCents, available: product.available, created: !previous?.exists },
    }));
  });
  return { id: productRef.id };
});

exports.addTenantMember = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const email = requireText(request.data?.email, "E-mail", 254).toLowerCase();
  const role = request.data?.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("invalid-argument", "E-mail inválido.");
  if (!["tenant_admin", "staff", "cashier", "driver"].includes(role)) fail("invalid-argument", "Perfil inválido.");
  let user;
  try { user = await getAuth().getUserByEmail(email); }
  catch (error) {
    if (error.code === "auth/user-not-found") fail("failed-precondition", "Esta conta ainda não existe. O convite por e-mail não está habilitado.");
    throw error;
  }
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const memberRef = db.doc(`memberships/${tenantId}_${user.uid}`);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const previous = await transaction.get(memberRef);
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    const manager = await requireTenantManager(transaction, tenantId, auth);
    if (role === "tenant_admin" && manager?.data.role !== "tenant_owner" && auth.token.platform_owner !== true) {
      fail("permission-denied", "Somente o responsável pode atribuir perfil de administrador.");
    }
    if (previous.exists && previous.data().role === "tenant_owner") fail("failed-precondition", "A conta responsável não pode ser substituída por esta ação.");
    const membership = {
      tenantId, userId: user.uid, email: user.email || email, displayName: user.displayName || "",
      role, status: "active", createdAt: previous.exists ? previous.data().createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (previous.exists) transaction.update(memberRef, membership);
    else transaction.create(memberRef, membership);
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: manager?.data.role || "platform_owner", action: "role.changed",
      entityType: "membership", entityId: memberRef.id, metadata: { userId: user.uid, email, role, status: "active" },
    }));
  });
  return { userId: user.uid, email: user.email || email, displayName: user.displayName || "", role, status: "active" };
});

exports.setTenantMemberStatus = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const userId = requireText(request.data?.userId, "Membro", 128);
  const status = request.data?.status;
  const reason = requireText(request.data?.reason, "Motivo", 500);
  if (!["active", "inactive"].includes(status)) fail("invalid-argument", "Status de membro inválido.");
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const memberRef = db.doc(`memberships/${tenantId}_${userId}`);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const memberSnapshot = await transaction.get(memberRef);
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    const manager = await requireTenantManager(transaction, tenantId, auth);
    if (!memberSnapshot.exists) fail("not-found", "Membro não encontrado.");
    if (memberSnapshot.data().role === "tenant_owner") fail("failed-precondition", "A conta responsável não pode ser desativada por esta ação.");
    transaction.update(memberRef, { status, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: manager?.data.role || "platform_owner", action: "role.changed",
      entityType: "membership", entityId: memberRef.id, reason, metadata: { previousStatus: memberSnapshot.data().status, status },
    }));
  });
  return { userId, status };
});

exports.createOrder = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const data = request.data || {};
  const tenantId = requireText(data.tenantId, "Sorveteria", 128);
  const fulfillmentMode = data.fulfillmentMode;
  if (!["delivery", "pickup"].includes(fulfillmentMode)) fail("invalid-argument", "Escolha entrega ou retirada.");
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 30) fail("invalid-argument", "Pedido sem itens válidos.");
  const customer = {
    name: requireText(data.customer?.name, "Nome", 120),
    phone: requireText(data.customer?.phone, "Telefone", 40),
  };
  const address = fulfillmentMode === "delivery" ? validateAddress(data.address) : null;
  const paymentMethodId = requireText(data.paymentMethodId, "Forma de pagamento", 40);
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const orderRef = tenantRef.collection("orders").doc();
  const trackingCode = generatedCode("SV-");
  const deliveryCode = fulfillmentMode === "delivery" ? generatedCode() : null;
  const trackingRef = tenantRef.collection("publicOrderTracking").doc(trackingCode);
  const productRefs = data.items.map((item) => {
    if (!item || typeof item !== "object") fail("invalid-argument", "Item do pedido inválido.");
    return tenantRef.collection("products").doc(requireText(item.productId, "Produto", 128));
  });
  let result;

  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all([
      transaction.get(tenantRef), transaction.get(tenantRef.collection("settings").doc("main")), transaction.get(trackingRef),
      ...productRefs.map((ref) => transaction.get(ref)),
    ]);
    const [tenantSnapshot, settingsSnapshot, trackingSnapshot, ...productSnapshots] = snapshots;
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria indisponível para novos pedidos.");
    if (trackingSnapshot.exists) fail("aborted", "Gere o pedido novamente.");
    const tenant = tenantSnapshot.data();
    const settings = settingsSnapshot.exists ? settingsSnapshot.data() : { deliveryFeeCents: 0, estimatedMinutes: 30, paymentMethods: [] };
    const paymentMethod = settings.paymentMethods?.find((method) => method.id === paymentMethodId && method.enabled === true);
    if (!paymentMethod) fail("failed-precondition", "Forma de pagamento indisponível.");
    if (fulfillmentMode === "delivery" && tenant.features?.delivery !== true) fail("failed-precondition", "Entrega indisponível nesta sorveteria.");
    if (fulfillmentMode === "pickup" && tenant.features?.pickup !== true) fail("failed-precondition", "Retirada indisponível nesta sorveteria.");

    const lineItems = [];
    let subtotalCents = 0;
    for (let index = 0; index < data.items.length; index += 1) {
      const input = data.items[index];
      const productSnapshot = productSnapshots[index];
      if (!productSnapshot.exists) fail("not-found", "Um produto do pedido não existe mais.");
      const product = productSnapshot.data();
      if (product.available !== true) fail("failed-precondition", `${product.name} está indisponível.`);
      if (typeof product.categoryId !== "string") fail("failed-precondition", "A categoria de um produto está inválida.");
      const categorySnapshot = await transaction.get(tenantRef.collection("categories").doc(product.categoryId));
      if (!categorySnapshot.exists || categorySnapshot.data().active !== true) fail("failed-precondition", `${product.name} não está em uma categoria disponível.`);
      const quantity = input.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail("invalid-argument", "Quantidade inválida.");
      const resolved = resolveSelections(product, input.selections || {});
      const lineTotalCents = resolved.priceCents * quantity;
      subtotalCents += lineTotalCents;
      lineItems.push({
        productId: productSnapshot.id,
        name: product.name,
        quantity,
        selections: resolved.selections,
        unitPriceCents: resolved.priceCents,
        lineTotalCents,
      });
    }
    const deliveryFeeCents = fulfillmentMode === "delivery" ? settings.deliveryFeeCents : 0;
    const totalCents = subtotalCents + deliveryFeeCents;
    const createdAt = FieldValue.serverTimestamp();
    const order = {
      tenantId,
      publicCode: trackingCode,
      customerId: request.auth?.uid || null,
      customer,
      address,
      fulfillmentMode,
      status: "received",
      source: { channel: "web" },
      items: lineItems,
      paymentMethodId,
      paymentMethodLabel: paymentMethod.label,
      money: { subtotalCents, deliveryFeeCents, discountCents: 0, totalCents },
      estimatedMinutes: settings.estimatedMinutes,
      deliveryCodeUsedAt: null,
      timeline: [{ status: "received", at: new Date().toISOString() }],
      createdAt,
      updatedAt: createdAt,
    };
    transaction.create(orderRef, order);
    transaction.create(trackingRef, {
      publicCode: trackingCode,
      status: "received",
      timeline: [{ status: "received", at: new Date().toISOString() }],
      fulfillmentMode,
      estimatedMinutes: settings.estimatedMinutes,
      createdAt,
      updatedAt: createdAt,
    });
    if (deliveryCode) transaction.create(tenantRef.collection("privateDeliveryCodes").doc(orderRef.id), {
      hash: deliveryCodeHash(deliveryCode, tenantId, orderRef.id),
      createdAt,
    });
    result = { orderId: orderRef.id, publicCode: trackingCode, deliveryCode };
  });
  return result;
});

exports.updateOrderStatus = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const orderId = requireText(request.data?.orderId, "Pedido", 128);
  const nextStatus = request.data?.status;
  const reason = typeof request.data?.reason === "string" ? request.data.reason.trim().slice(0, 500) : "";
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const orderRef = tenantRef.collection("orders").doc(orderId);
  const trackingRefHolder = { ref: null };
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const orderSnapshot = await transaction.get(orderRef);
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    if (!orderSnapshot.exists) fail("not-found", "Pedido não encontrado.");
    const membership = await requireTenantAdmin(transaction, tenantId, auth);
    const order = orderSnapshot.data();
    if (!canTransition(order.status, nextStatus, order.fulfillmentMode)) fail("failed-precondition", "Transição de pedido inválida.");
    if (nextStatus === "cancelled" && reason.length < 3) fail("invalid-argument", "Informe o motivo do cancelamento.");
    const publicRef = tenantRef.collection("publicOrderTracking").doc(order.publicCode);
    const publicSnapshot = await transaction.get(publicRef);
    const deliveryRef = tenantRef.collection("deliveries").doc(orderId);
    const deliverySnapshot = nextStatus === "cancelled" ? await transaction.get(deliveryRef) : null;
    const privateCodeRef = tenantRef.collection("privateDeliveryCodes").doc(orderId);
    const privateCodeSnapshot = nextStatus === "cancelled" ? await transaction.get(privateCodeRef) : null;
    const timestamp = new Date().toISOString();
    const timeline = [...(order.timeline || []), { status: nextStatus, at: timestamp }];
    transaction.update(orderRef, { status: nextStatus, timeline, updatedAt: FieldValue.serverTimestamp() });
    if (publicSnapshot.exists) transaction.update(publicRef, { status: nextStatus, timeline, updatedAt: FieldValue.serverTimestamp() });
    if (nextStatus === "cancelled") {
      if (deliverySnapshot?.exists) transaction.update(deliveryRef, { status: "cancelled", deliveryCodeHash: null, updatedAt: FieldValue.serverTimestamp() });
      if (privateCodeSnapshot?.exists) transaction.delete(privateCodeRef);
    }
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: membership?.data.role || "platform_owner", action: "order.status_changed",
      entityType: "order", entityId: orderId, reason, metadata: { from: order.status, to: nextStatus },
    }));
  });
  return { success: true };
});

exports.assignDelivery = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const orderId = requireText(request.data?.orderId, "Pedido", 128);
  const driverId = requireText(request.data?.driverId, "Entregador", 128);
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const orderRef = tenantRef.collection("orders").doc(orderId);
  const deliveryRef = tenantRef.collection("deliveries").doc(orderId);
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const orderSnapshot = await transaction.get(orderRef);
    const driverRef = db.doc(`memberships/${tenantId}_${driverId}`);
    const driverSnapshot = await transaction.get(driverRef);
    const deliverySnapshot = await transaction.get(deliveryRef);
    const privateCodeRef = tenantRef.collection("privateDeliveryCodes").doc(orderId);
    const privateCodeSnapshot = await transaction.get(privateCodeRef);
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    const manager = await requireTenantAdmin(transaction, tenantId, auth);
    if (!orderSnapshot.exists) fail("not-found", "Pedido não encontrado.");
    const order = orderSnapshot.data();
    const isReassignment = order.status === "out_for_delivery" && deliverySnapshot.exists && deliverySnapshot.data().status === "failed";
    if (order.fulfillmentMode !== "delivery" || (order.status !== "ready" && !isReassignment)) fail("failed-precondition", "Pedido não está pronto para atribuição.");
    if (!driverSnapshot.exists || driverSnapshot.data().role !== "driver" || driverSnapshot.data().status !== "active") fail("failed-precondition", "Entregador não pertence a esta sorveteria.");
    if (deliverySnapshot.exists && !isReassignment) fail("already-exists", "Já existe entrega para este pedido.");
    const codeHash = deliverySnapshot.exists ? deliverySnapshot.data().deliveryCodeHash : privateCodeSnapshot.data()?.hash;
    if (!codeHash) fail("failed-precondition", "Código de confirmação indisponível.");
    const deliveryData = {
      tenantId, orderId, driverId, status: "assigned",
      failedAttempts: deliverySnapshot.exists ? (deliverySnapshot.data().failedAttempts || 0) : 0,
      confirmationFailures: deliverySnapshot.exists ? (deliverySnapshot.data().confirmationFailures || 0) : 0,
      deliveryCodeHash: codeHash,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };
    if (deliverySnapshot.exists) transaction.update(deliveryRef, deliveryData);
    else transaction.create(deliveryRef, deliveryData);
    const nextStatus = isReassignment ? "out_for_delivery" : "awaiting_driver";
    const timeline = isReassignment ? order.timeline || [] : [...(order.timeline || []), { status: "awaiting_driver", at: new Date().toISOString() }];
    transaction.update(orderRef, { status: nextStatus, timeline, updatedAt: FieldValue.serverTimestamp() });
    const publicRef = tenantRef.collection("publicOrderTracking").doc(order.publicCode);
    transaction.update(publicRef, { status: nextStatus, timeline, updatedAt: FieldValue.serverTimestamp() });
    if (privateCodeSnapshot.exists) transaction.delete(privateCodeRef);
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId, actorId: auth.uid, actorRole: manager?.data.role || "platform_owner", action: isReassignment ? "delivery.reassigned" : "delivery.assigned", entityType: "delivery", entityId: orderId, metadata: { driverId },
    }));
  });
  return { success: true, deliveryId: orderId };
});

exports.driverDeliveryAction = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const deliveryId = requireText(request.data?.deliveryId, "Entrega", 128);
  const action = request.data?.action;
  const code = typeof request.data?.deliveryCode === "string" ? request.data.deliveryCode.trim().toUpperCase() : "";
  if (!["start", "arrive", "deliver", "failed"].includes(action)) fail("invalid-argument", "Ação de entrega inválida.");
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const deliveryRef = tenantRef.collection("deliveries").doc(deliveryId);
  const orderRef = tenantRef.collection("orders").doc(deliveryId);
  let invalidCode = false;
  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const deliverySnapshot = await transaction.get(deliveryRef);
    const orderSnapshot = await transaction.get(orderRef);
    const membershipRef = db.doc(`memberships/${tenantId}_${auth.uid}`);
    const membershipSnapshot = await transaction.get(membershipRef);
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    if (!membershipSnapshot.exists || membershipSnapshot.data().role !== "driver" || membershipSnapshot.data().status !== "active") fail("permission-denied", "Entregador sem vínculo ativo.");
    if (!deliverySnapshot.exists || !orderSnapshot.exists) fail("not-found", "Entrega não encontrada.");
    const delivery = deliverySnapshot.data();
    const order = orderSnapshot.data();
    if (delivery.driverId !== auth.uid || delivery.tenantId !== tenantId) fail("permission-denied", "Entrega atribuída a outra pessoa.");
    if (!canTransitionDelivery(delivery.status, action)) fail("failed-precondition", "Ação não permitida no estado atual da entrega.");
    if (action === "start" && delivery.status === "assigned") {
      const timestamp = new Date().toISOString();
      const timeline = [...(order.timeline || []), { status: "out_for_delivery", at: timestamp }];
      transaction.update(deliveryRef, { status: "out_for_delivery", updatedAt: FieldValue.serverTimestamp() });
      transaction.update(orderRef, { status: "out_for_delivery", timeline, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(tenantRef.collection("publicOrderTracking").doc(order.publicCode), { status: "out_for_delivery", timeline, updatedAt: FieldValue.serverTimestamp() });
    } else if (action === "arrive" && delivery.status === "out_for_delivery") {
      transaction.update(deliveryRef, { status: "arrived", updatedAt: FieldValue.serverTimestamp() });
      const timeline = [...(order.timeline || []), { status: "arrived", at: new Date().toISOString() }];
      transaction.update(tenantRef.collection("publicOrderTracking").doc(order.publicCode), { timeline, updatedAt: FieldValue.serverTimestamp() });
    } else if (action === "failed" && ["out_for_delivery", "arrived"].includes(delivery.status)) {
      transaction.update(deliveryRef, { status: "failed", failedAttempts: (delivery.failedAttempts || 0) + 1, updatedAt: FieldValue.serverTimestamp() });
      const timeline = [...(order.timeline || []), { status: "delivery_attempt_failed", at: new Date().toISOString() }];
      transaction.update(tenantRef.collection("publicOrderTracking").doc(order.publicCode), { timeline, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({ tenantId, actorId: auth.uid, actorRole: "driver", action: "delivery.failed", entityType: "delivery", entityId: deliveryId }));
    } else if (action === "deliver" && delivery.status === "arrived") {
      if ((delivery.confirmationFailures || 0) >= 5) fail("resource-exhausted", "Limite de tentativas de confirmação atingido.");
      if (!isDeliveryCodeValid(code) || !delivery.deliveryCodeHash || order.deliveryCodeUsedAt) {
        invalidCode = true;
        transaction.update(deliveryRef, { confirmationFailures: (delivery.confirmationFailures || 0) + 1, updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      const expected = Buffer.from(delivery.deliveryCodeHash, "hex");
      const actual = Buffer.from(deliveryCodeHash(code, tenantId, orderRef.id), "hex");
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        invalidCode = true;
        transaction.update(deliveryRef, { confirmationFailures: (delivery.confirmationFailures || 0) + 1, updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      const timestamp = new Date().toISOString();
      const timeline = [...(order.timeline || []), { status: "delivered", at: timestamp }];
      transaction.update(deliveryRef, { status: "delivered", deliveryCodeHash: null, codeUsedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.update(orderRef, { status: "delivered", deliveryCodeUsedAt: FieldValue.serverTimestamp(), timeline, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(tenantRef.collection("publicOrderTracking").doc(order.publicCode), { status: "delivered", timeline, updatedAt: FieldValue.serverTimestamp() });
    } else {
      fail("failed-precondition", "Ação não permitida no estado atual da entrega.");
    }
  });
  if (invalidCode) fail("permission-denied", "Código inválido. Confira com o cliente.");
  return { success: true };
});

exports.resetDeliveryConfirmationCode = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const tenantId = requireText(request.data?.tenantId, "Sorveteria", 128);
  const orderId = requireText(request.data?.orderId, "Pedido", 128);
  const reason = requireText(request.data?.reason, "Motivo", 500);
  if (reason.length < 3) fail("invalid-argument", "Informe um motivo válido para redefinir o código.");
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const orderRef = tenantRef.collection("orders").doc(orderId);
  const deliveryRef = tenantRef.collection("deliveries").doc(orderId);
  const deliveryCode = generatedCode();

  await db.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const orderSnapshot = await transaction.get(orderRef);
    const deliverySnapshot = await transaction.get(deliveryRef);
    let membership = null;
    if (auth.token.platform_owner !== true) {
      membership = await readActiveMembership(transaction, tenantId, auth.uid);
      if (membership.data.role !== "tenant_owner") fail("permission-denied", "Somente o responsável ou Platform Owner pode redefinir o código.");
    }
    if (!tenantSnapshot.exists || tenantSnapshot.data().status !== "active") fail("failed-precondition", "Sorveteria suspensa ou inexistente.");
    if (!orderSnapshot.exists || !deliverySnapshot.exists) fail("not-found", "Entrega não encontrada.");
    const order = orderSnapshot.data();
    const delivery = deliverySnapshot.data();
    if (order.fulfillmentMode !== "delivery" || ["delivered", "cancelled"].includes(order.status)) {
      fail("failed-precondition", "O código não pode ser redefinido para este pedido.");
    }
    if ((delivery.confirmationFailures || 0) < 5) fail("failed-precondition", "Redefinição disponível somente após o limite de tentativas de confirmação.");
    transaction.update(deliveryRef, {
      deliveryCodeHash: deliveryCodeHash(deliveryCode, tenantId, orderId),
      confirmationFailures: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(tenantRef.collection("auditLogs").doc(), auditRecord({
      tenantId,
      actorId: auth.uid,
      actorRole: auth.token.platform_owner === true ? "platform_owner" : membership.data.role,
      action: "delivery.confirmation_code_reset",
      entityType: "delivery",
      entityId: orderId,
      reason,
      metadata: { confirmationFailures: delivery.confirmationFailures || 0 },
    }));
  });
  return { deliveryCode };
});

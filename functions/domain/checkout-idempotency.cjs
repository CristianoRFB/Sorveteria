"use strict";
const { createHash } = require("node:crypto");
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function normalizeCheckoutRequestId(value) {
  if (value == null) return null;
  if (typeof value !== "string" || !REQUEST_ID_PATTERN.test(value)) throw new TypeError("Identificador de tentativa do pedido inválido.");
  return value.toLowerCase();
}
function sha256(text) { return createHash("sha256").update(text).digest("hex"); }
function checkoutDocumentId(tenantId, _uid, requestId) {
  // A retry can outlive a Firebase Auth session. UUID v4 is an idempotency key, not authorization.
  return sha256(JSON.stringify(["sorveteria-checkout-v1", tenantId, requestId]));
}
function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0);
    return Object.fromEntries(entries.map(([key, nested]) => [key, canonicalizeJson(nested)]));
  }
  return value;
}
function assertCheckoutFingerprintInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)
    || !data.customer || typeof data.customer !== "object" || Array.isArray(data.customer)
    || typeof data.customer.name !== "string" || typeof data.customer.phone !== "string"
    || !Array.isArray(data.items) || data.items.length < 1 || data.items.length > 30) {
    throw new TypeError("Dados da tentativa de checkout inválidos.");
  }
  const validText = (s, max) => typeof s === "string" && s.trim().length > 0 && s.trim().length <= max;
  if (!validText(data.tenantId,128) || !["delivery","pickup"].includes(data.fulfillmentMode)
    || !validText(data.paymentMethodId,40) || !validText(data.customer.name,120)
    || !validText(data.customer.phone,40)) throw new TypeError("Campos obrigatórios do checkout inválidos.");
  if (data.fulfillmentMode === "delivery") {
    const a = data.address;
    if (!a || typeof a !== "object" || Array.isArray(a)
      || Object.keys(a).some(k => !["street","number","neighborhood","reference"].includes(k))
      || !validText(a.street,160) || !validText(a.number,32) || !validText(a.neighborhood,100)
      || (a.reference !== undefined && (typeof a.reference !== "string" || a.reference.length > 180)))
      throw new TypeError("Endereço da tentativa de checkout inválido.");
  }
  for (const item of data.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || typeof item.productId !== "string" || !item.productId.trim() || item.productId.length > 128
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)
      throw new TypeError("Item da tentativa de checkout inválido.");
    const selections = item.selections ?? {};
    if (!selections || typeof selections !== "object" || Array.isArray(selections)) throw new TypeError("Seleções do checkout inválidas.");
    const groups = Object.entries(selections);
    if (groups.length > 20 || groups.some(([k,chosen]) =>
      !k || k.length > 64 || ["__proto__","prototype","constructor"].includes(k)
      || !Array.isArray(chosen) || chosen.length > 20
      || chosen.some(o=>typeof o !== "string" || !o.trim() || o.length > 64)
      || new Set(chosen).size !== chosen.length))
      throw new TypeError("Opções do checkout inválidas.");
  }
}
function checkoutFingerprint(data) {
  assertCheckoutFingerprintInput(data);
  return sha256(JSON.stringify(canonicalizeJson({
    tenantId:data.tenantId, fulfillmentMode:data.fulfillmentMode,
    customer:{name:data.customer.name,phone:data.customer.phone},
    address:data.fulfillmentMode === "delivery" ? data.address : null,
    paymentMethodId:data.paymentMethodId,
    items:data.items.map(i=>({productId:i.productId,quantity:i.quantity,selections:i.selections??{}})),
  })));
}
function replayCheckout(record, expectedFingerprint) {
  if (!record || record.fingerprint !== expectedFingerprint)
    throw new TypeError("Esta tentativa já foi usada com dados diferentes. Confirme o pedido existente antes de recomeçar.");
  if (typeof record.orderId !== "string" || typeof record.publicCode !== "string")
    throw new TypeError("Registro de tentativa inconsistente. Consulte o suporte.");
  return {orderId:record.orderId,publicCode:record.publicCode,deliveryCode:null,replayed:true};
}
module.exports = {normalizeCheckoutRequestId,checkoutDocumentId,checkoutFingerprint,replayCheckout};

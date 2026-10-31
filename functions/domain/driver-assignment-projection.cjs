"use strict";
/**
 * Narrow, tenant- and driver-scoped HTTPS projection for delivery assignments.
 * Firestore documents (including nested objects) must never be spread into JSON.
 */
const DELIVERY_STATUSES = new Set([
  "assigned", "out_for_delivery", "arrived", "delivered", "failed", "cancelled",
]);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const PUBLIC_CODE = /^SV-[A-HJ-NP-Z2-9]{8}$/;
const text = (value, max) => typeof value === "string" ? value.slice(0, max) : "";
const count = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000) : 0;

function projectDriverAssignment(id, tenantId, driverId, delivery, order) {
  if (!SAFE_ID.test(id) || !SAFE_ID.test(tenantId) || !SAFE_ID.test(driverId)
    || !delivery || typeof delivery !== "object"
    || delivery.driverId !== driverId
    || (delivery.tenantId !== undefined && delivery.tenantId !== tenantId)
    || !SAFE_ID.test(delivery.orderId)
    || !DELIVERY_STATUSES.has(delivery.status)) return null;
  // A corrupted/misrouted order must not expose a different tenant's PII.
  if (order && (typeof order !== "object"
    || (order.tenantId !== undefined && order.tenantId !== tenantId)
    || (order.fulfillmentMode !== undefined && order.fulfillmentMode !== "delivery"))) return null;
  const result = {
    id, tenantId, orderId: delivery.orderId, driverId,
    status: delivery.status,
    failedAttempts: count(delivery.failedAttempts),
    confirmationFailures: count(delivery.confirmationFailures),
  };
  if (!order) return result;
  if (typeof order.publicCode === "string" && PUBLIC_CODE.test(order.publicCode)) {
    result.publicCode = order.publicCode;
  }
  const address = order.address;
  if (address && typeof address === "object" && !Array.isArray(address)) {
    result.address = {
      street: text(address.street, 160),
      number: text(address.number, 32),
      neighborhood: text(address.neighborhood, 100),
      reference: text(address.reference, 180),
    };
  }
  const customer = order.customer;
  if (customer && typeof customer === "object" && !Array.isArray(customer)) {
    result.customer = { name: text(customer.name, 120), phone: text(customer.phone, 40) };
  }
  return result;
}
module.exports = { projectDriverAssignment };

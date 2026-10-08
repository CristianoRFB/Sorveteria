const { createHash } = require("node:crypto");

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DELIVERY_ACTIONS_BY_STATUS = {
  assigned: ["start"],
  out_for_delivery: ["arrive", "failed"],
  arrived: ["deliver", "failed"],
  delivered: [],
  failed: [],
  cancelled: [],
};

function codeFromBytes(bytes, prefix = "") {
  const code = Array.from(bytes.slice(0, 8), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${prefix}${code}`;
}

function isDeliveryCodeValid(code) {
  return typeof code === "string" && /^[A-HJ-NP-Z2-9]{8}$/.test(code);
}

function deliveryCodeHash(code, tenantId, orderId) {
  return createHash("sha256").update(`${tenantId}:${orderId}:${code}`).digest("hex");
}

function canTransitionDelivery(status, action) {
  return DELIVERY_ACTIONS_BY_STATUS[status]?.includes(action) ?? false;
}

module.exports = { canTransitionDelivery, codeFromBytes, deliveryCodeHash, isDeliveryCodeValid };

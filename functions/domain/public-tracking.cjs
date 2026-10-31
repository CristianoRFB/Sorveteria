"use strict";
const allowedStatuses = new Set([
  "received","confirmed","preparing","ready","awaiting_driver","out_for_delivery",
  "arrived","ready_for_pickup","delivered","picked_up","cancelled",
]);
// Delivery-attempt events belong in the timeline, never in the current order status.
const timelineStatuses = new Set([...allowedStatuses, "delivery_attempt_failed"]);
const codePattern = /^SV-[A-HJ-NP-Z2-9]{8}$/;
/** Only the public allowlist is returned. Never spread a Firestore document into public JSON. */
function projectPublicTracking(record, expectedCode) {
  if (!codePattern.test(expectedCode) || !record || record.publicCode !== expectedCode
    || !allowedStatuses.has(record.status)
    || !["delivery","pickup"].includes(record.fulfillmentMode)
    || !Array.isArray(record.timeline) || record.timeline.length > 100) return null;
  const timeline = [];
  for (const event of record.timeline) {
    if (!event || !timelineStatuses.has(event.status)
      || typeof event.at !== "string" || !Number.isFinite(Date.parse(event.at))) return null;
    timeline.push({status:event.status,at:event.at});
  }
  const publicData = {
    publicCode:expectedCode,
    status:record.status,
    fulfillmentMode:record.fulfillmentMode,
    timeline,
  };
  if (Number.isInteger(record.estimatedMinutes) && record.estimatedMinutes > 0 && record.estimatedMinutes <= 240) {
    publicData.estimatedMinutes = record.estimatedMinutes;
  }
  return publicData;
}
module.exports = { projectPublicTracking };

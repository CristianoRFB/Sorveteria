"use strict";
/**
 * A membership is authoritative only when its tenant and Firebase UID match
 * the exact path being read. A matching document ID or role alone is not enough.
 */
function isActiveTenantMembership(record, tenantId, uid) {
  return Boolean(record && typeof record === "object" && !Array.isArray(record)
    && typeof tenantId === "string" && tenantId.length > 0
    && typeof uid === "string" && uid.length > 0
    && record.tenantId === tenantId && record.userId === uid
    && record.status === "active");
}
module.exports = { isActiveTenantMembership };

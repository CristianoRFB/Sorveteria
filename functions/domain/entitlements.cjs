const planCatalog = require("./plan-catalog.json");
const featureAvailability = require("./feature-availability.json");

const operationalFeatureFlags = {
  online_menu: "onlineMenu",
  pickup: "pickup",
  simple_delivery: "delivery",
  qr_menu: "qrCodes",
};

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  return Number.NaN;
}

function commercialAccess(tenant, options = {}) {
  if (!tenant || tenant.status !== "active") return { allowed: false, reason: "tenant-inactive", plan: null };
  const plan = planCatalog.plans[tenant.planId];
  if (!plan || typeof tenant.subscriptionStatus !== "string") return { allowed: false, reason: "plan-unassigned", plan: null };

  if (tenant.subscriptionStatus === "demo") {
    if (tenant.planId !== "premium" || options.demoAllowed !== true) return { allowed: false, reason: "demo-unavailable", plan };
    return { allowed: true, reason: null, plan };
  }
  if (["active", "past_due"].includes(tenant.subscriptionStatus)) return { allowed: true, reason: null, plan };
  if (tenant.subscriptionStatus === "trial") {
    if (tenant.planId !== planCatalog.trial.planId) return { allowed: false, reason: "invalid-trial", plan };
    const until = timestampMillis(tenant.trialUntil);
    if (!Number.isFinite(until)) return { allowed: false, reason: "invalid-trial", plan };
    if (options.nowMs >= until) return { allowed: false, reason: "trial-expired", plan };
    return { allowed: true, reason: null, plan };
  }
  if (tenant.subscriptionStatus === "suspended") return { allowed: false, reason: "subscription-suspended", plan };
  if (tenant.subscriptionStatus === "cancelled") return { allowed: false, reason: "subscription-cancelled", plan };
  return { allowed: false, reason: "subscription-invalid", plan };
}

function evaluateFeature(tenant, feature, options = {}) {
  const access = commercialAccess(tenant, { ...options, nowMs: options.nowMs ?? Date.now() });
  if (!access.allowed) return { allowed: false, reason: access.reason, planId: tenant?.planId ?? null };
  if (!Object.hasOwn(featureAvailability, feature)) return { allowed: false, reason: "feature-unknown", planId: tenant.planId };
  const override = tenant.entitlementOverrides?.[feature];
  const entitled = typeof override === "boolean" ? override : access.plan.features.includes(feature);
  if (!entitled) return { allowed: false, reason: "plan-required", planId: tenant.planId };
  if (featureAvailability[feature] !== "implemented") return { allowed: false, reason: "feature-not-implemented", planId: tenant.planId };
  const operationalFlag = operationalFeatureFlags[feature];
  if (operationalFlag && tenant.features?.[operationalFlag] !== true) {
    return { allowed: false, reason: "feature-disabled-for-tenant", planId: tenant.planId };
  }
  return { allowed: true, reason: null, planId: tenant.planId };
}

function canUse(tenant, feature, options = {}) {
  return evaluateFeature(tenant, feature, options).allowed;
}

function getLimit(tenant, limitName, options = {}) {
  const access = commercialAccess(tenant, { ...options, nowMs: options.nowMs ?? Date.now() });
  if (!access.allowed || !Object.hasOwn(access.plan.limits, limitName)) return 0;
  const override = tenant.limitOverrides?.[limitName];
  const baseLimit = access.plan.limits[limitName];
  if (typeof override === "number" && Number.isInteger(override) && override > 0) {
    if (limitName === "establishments") return Math.min(baseLimit, override);
    return override;
  }
  if (override === null) return limitName === "establishments" ? baseLimit : null;
  return baseLimit;
}

module.exports = { canUse, commercialAccess, evaluateFeature, getLimit, planCatalog, featureAvailability };

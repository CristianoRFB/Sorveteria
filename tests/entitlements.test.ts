import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { canUse, commercialAccess, evaluateFeature, getLimit, planCatalog } = require("../functions/domain/entitlements.cjs") as {
  canUse: (tenant: Record<string, unknown>, feature: string, options?: Record<string, unknown>) => boolean;
  commercialAccess: (tenant: Record<string, unknown>, options?: Record<string, unknown>) => { allowed: boolean; reason: string | null };
  evaluateFeature: (tenant: Record<string, unknown>, feature: string, options?: Record<string, unknown>) => { allowed: boolean; reason: string | null };
  getLimit: (tenant: Record<string, unknown>, name: string, options?: Record<string, unknown>) => number | null;
  planCatalog: { plans: Record<string, { monthlyPriceCents: number; annualPriceCents: number; limits: Record<string, number | null>; features: string[] }>; trial: { planId: string; durationDays: number; requiresPaymentMethod: boolean } };
};

function tenant(overrides: Record<string, unknown> = {}) {
  return {
    status: "active",
    planId: "essencial",
    subscriptionStatus: "active",
    features: { onlineMenu: true, pickup: true, delivery: true, qrCodes: true },
    ...overrides,
  };
}

describe("Global Standard v01 — catálogo e entitlement da sorveteria", () => {
  it("preserva preços aprovados em centavos, herança e limites sem teto artificial", () => {
    expect(planCatalog.plans.essencial).toMatchObject({ monthlyPriceCents: 6990, annualPriceCents: 69900 });
    expect(planCatalog.plans.pro).toMatchObject({ monthlyPriceCents: 12990, annualPriceCents: 129900 });
    expect(planCatalog.plans.premium).toMatchObject({ monthlyPriceCents: 22990, annualPriceCents: 229900 });
    expect(planCatalog.plans.pro.features).toEqual(expect.arrayContaining(planCatalog.plans.essencial.features));
    expect(planCatalog.plans.premium.features).toEqual(expect.arrayContaining(planCatalog.plans.pro.features));
    for (const plan of Object.values(planCatalog.plans)) {
      expect(plan.limits.establishments).toBe(1);
      expect(plan.limits.orders).toBeNull();
      expect(plan.limits.products).toBeNull();
      expect(plan.limits.storage).toBeNull();
      expect(plan.limits.history).toBeNull();
      expect(plan.limits.automationRuns).toBeNull();
    }
  });

  it("falha fechado quando plano, status ou feature não estão definidos", () => {
    expect(commercialAccess(tenant({ planId: null, subscriptionStatus: null })).reason).toBe("plan-unassigned");
    expect(canUse(tenant({ planId: "future" }), "online_menu")).toBe(false);
    expect(canUse(tenant({ subscriptionStatus: "unknown" }), "online_menu")).toBe(false);
    expect(canUse(tenant(), "feature-typo")).toBe(false);
  });

  it("separa plano, disponibilidade técnica e configuração operacional", () => {
    expect(canUse(tenant(), "online_menu")).toBe(true);
    expect(evaluateFeature(tenant({ features: { onlineMenu: false } }), "online_menu")).toMatchObject({ allowed: false, reason: "feature-disabled-for-tenant" });
    expect(evaluateFeature(tenant({ planId: "premium" }), "inventory")).toMatchObject({ allowed: false, reason: "feature-not-implemented" });
    expect(evaluateFeature(tenant({ entitlementOverrides: { inventory: true }, planId: "premium" }), "inventory")).toMatchObject({ allowed: false, reason: "feature-not-implemented" });
    expect(evaluateFeature(tenant({ entitlementOverrides: { online_menu: false } }), "online_menu")).toMatchObject({ allowed: false, reason: "plan-required" });
  });

  it("aplica status, trial de 14 dias no Pro e demo local com dados fictícios", () => {
    expect(commercialAccess(tenant({ subscriptionStatus: "past_due" })).allowed).toBe(true);
    expect(commercialAccess(tenant({ subscriptionStatus: "suspended" })).allowed).toBe(false);
    expect(commercialAccess(tenant({ subscriptionStatus: "trial", planId: "pro", trialUntil: new Date(2000) }), { nowMs: 1999 })).toMatchObject({ allowed: true });
    expect(commercialAccess(tenant({ subscriptionStatus: "trial", planId: "pro", trialUntil: new Date(2000) }), { nowMs: 2000 })).toMatchObject({ allowed: false, reason: "trial-expired" });
    expect(commercialAccess(tenant({ subscriptionStatus: "trial", planId: "essencial", trialUntil: new Date(5000) }), { nowMs: 1000 })).toMatchObject({ allowed: false, reason: "invalid-trial" });
    expect(planCatalog.trial).toEqual({ planId: "pro", durationDays: 14, requiresPaymentMethod: false });
    expect(evaluateFeature(tenant({ planId: "premium", subscriptionStatus: "demo" }), "online_menu")).toMatchObject({ allowed: false, reason: "demo-unavailable" });
    expect(evaluateFeature(tenant({ planId: "premium", subscriptionStatus: "demo" }), "online_menu", { demoAllowed: true }).allowed).toBe(true);
  });

  it("resolve limites fail-closed, ilimitados explícitos e overrides respeitando teto de estabelecimentos", () => {
    expect(getLimit(tenant(), "internalUsersActive")).toBe(2);
    expect(getLimit(tenant(), "orders")).toBeNull();
    expect(getLimit(tenant(), "unknown")).toBe(0);
    expect(getLimit(tenant({ limitOverrides: { internalUsersActive: 4 } }), "internalUsersActive")).toBe(4);
    expect(getLimit(tenant({ limitOverrides: { internalUsersActive: null } }), "internalUsersActive")).toBeNull();
    expect(getLimit(tenant({ limitOverrides: { establishments: null } }), "establishments")).toBe(1);
    expect(getLimit(tenant({ planId: null, subscriptionStatus: null }), "orders")).toBe(0);
  });
});

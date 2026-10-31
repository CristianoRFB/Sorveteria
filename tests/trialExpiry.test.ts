import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { commercialAccess, canUse, getLimit } = require("../functions/domain/entitlements.cjs") as {
  commercialAccess: (tenant: Record<string, unknown>, options?: { nowMs?: number }) => { allowed: boolean; reason: string | null };
  canUse: (tenant: Record<string, unknown>, feature: string, options?: { nowMs?: number }) => boolean;
  getLimit: (tenant: Record<string, unknown>, limitName: string, options?: { nowMs?: number }) => number | null;
};

function trial(until: Date) {
  return {
    status: "active",
    planId: "pro",
    subscriptionStatus: "trial",
    trialUntil: until,
    features: { onlineMenu: true, pickup: true, delivery: true, qrCodes: true },
  };
}

describe("Trial expiration security boundary", () => {
  it("blocks an expired trial even when commercialAccess is invoked without nowMs", () => {
    const expired = trial(new Date(Date.now() - 60_000));
    expect(commercialAccess(expired)).toMatchObject({ allowed: false, reason: "trial-expired" });
    expect(canUse(expired, "online_menu")).toBe(false);
    expect(getLimit(expired, "orders")).toBe(0);
  });

  it("allows a not-yet-expired trial without nowMs", () => {
    expect(commercialAccess(trial(new Date(Date.now() + 60_000))).allowed).toBe(true);
  });

  it("fails closed for an explicitly invalid clock override", () => {
    expect(commercialAccess(trial(new Date(Date.now() + 60_000)), { nowMs: Number.NaN })).toMatchObject({
      allowed: false,
      reason: "trial-expired",
    });
  });
});

import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { commercialAccess, canUse, getLimit, planCatalog } = require("../functions/domain/entitlements.cjs");
function tenant(planId: string) { return { status: "active", planId, subscriptionStatus: "active", features: { onlineMenu: true, pickup: true, delivery: true, qrCodes: true } }; }
describe("Global Standard: no inherited plan identifiers", () => {
  it.each(["__proto__", "constructor", "toString", "hasOwnProperty", "future-plan"])("blocks inherited or unknown plan %s", (id) => {
    const t = tenant(id);
    expect(commercialAccess(t)).toMatchObject({allowed:false,reason:"plan-unassigned"});
    expect(canUse(t,"online_menu")).toBe(false);
    expect(getLimit(t,"internalUsersActive")).toBe(0);
  });
  it("retains the approved plans", () => {
    for (const id of ["essencial","pro","premium"]) {
      expect(Object.hasOwn(planCatalog.plans,id)).toBe(true);
      expect(commercialAccess(tenant(id)).allowed).toBe(true);
    }
  });
});

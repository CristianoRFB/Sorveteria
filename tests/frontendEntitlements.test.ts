import { describe, expect, it, vi } from "vitest";
import type { Tenant } from "../src/domain/tenant";
vi.mock("@/lib/firebase", () => ({ usingFirebaseEmulators: false }));
import { evaluateTenantFeature, commercialStatusMessage } from "../src/domain/entitlements";
const trial = {id:"tenant-alpha",slug:"tenant-alpha",status:"active",planId:"pro",subscriptionStatus:"trial",trialUntil:new Date(2000),features:{onlineMenu:true,pickup:true,delivery:true,qrCodes:true}} as Tenant;
describe("Frontend/backend entitlement agreement", () => {
  it("rejects invalid trial clocks", () => {
    for (const now of [NaN, Infinity, -Infinity]) expect(evaluateTenantFeature(trial,"online_menu",now)).toMatchObject({allowed:false,reason:"trial-expired"});
  });
  it("allows before expiry; blocks at the boundary", () => {
    expect(evaluateTenantFeature(trial,"online_menu",1999).allowed).toBe(true);
    expect(evaluateTenantFeature(trial,"online_menu",2000).allowed).toBe(false);
  });
  it("blocks unknown subscription states with an intelligible message", () => {
    const t={...trial,subscriptionStatus:"future-status"} as unknown as Tenant;
    expect(evaluateTenantFeature(t,"online_menu")).toMatchObject({allowed:false,reason:"subscription-invalid"});
    expect(commercialStatusMessage(t)).toContain("inválido");
  });
  it.each(["constructor","__proto__","toString"])("rejects inherited planId %s",(id)=>{
    const t={...trial,planId:id,subscriptionStatus:"active"} as unknown as Tenant;
    expect(evaluateTenantFeature(t,"online_menu")).toMatchObject({allowed:false,reason:"plan-unassigned"});
  });
});

import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { isActiveTenantMembership } = require("../functions/domain/membership.cjs");
const active = { tenantId: "tenant-alpha", userId: "uid-alpha", role: "tenant_admin", status: "active" };
describe("server-side membership tenant/UID validation", () => {
  it("accepts a membership only for its actual tenant and Firebase identity", () => {
    expect(isActiveTenantMembership(active,"tenant-alpha","uid-alpha")).toBe(true);
    expect(isActiveTenantMembership(active,"tenant-beta","uid-alpha")).toBe(false);
    expect(isActiveTenantMembership(active,"tenant-alpha","uid-beta")).toBe(false);
  });
  it("denies mismatched document data even if role appears privileged", () => {
    expect(isActiveTenantMembership({ ...active, tenantId: "tenant-beta" },"tenant-alpha","uid-alpha")).toBe(false);
    expect(isActiveTenantMembership({ ...active, userId: "platform-owner" },"tenant-alpha","uid-alpha")).toBe(false);
    expect(isActiveTenantMembership({ ...active, status: "inactive" },"tenant-alpha","uid-alpha")).toBe(false);
  });
  it("fails closed for missing or malformed memberships", () => {
    expect(isActiveTenantMembership(null,"tenant-alpha","uid-alpha")).toBe(false);
    expect(isActiveTenantMembership({},"tenant-alpha","uid-alpha")).toBe(false);
    expect(isActiveTenantMembership([],"tenant-alpha","uid-alpha")).toBe(false);
  });
});

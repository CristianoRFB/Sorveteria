import { describe, expect, it } from "vitest";
import { canAccessTenantAdmin, canManageTenant, isPlatformOwner } from "@/services/tenantAccess";

describe("tenant access helpers", () => {
  it("preserva acesso global do platform owner", () => {
    expect(isPlatformOwner("platform_owner")).toBe(true);
    expect(canManageTenant("platform_owner")).toBe(true);
  });

  it("permite tenant owner administrar somente pelo contexto do tenant", () => {
    expect(canManageTenant("tenant_owner")).toBe(true);
  });

  it("não considera customer ou driver administradores", () => {
    expect(canAccessTenantAdmin("customer")).toBe(false);
    expect(canAccessTenantAdmin("driver")).toBe(false);
  });
});

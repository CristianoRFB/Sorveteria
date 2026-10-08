import { describe, expect, it, vi } from "vitest";
import { createTenantResolver } from "@/services/tenantResolver";
import type { Tenant } from "@/domain/tenant";

const activeTenant = { id: "tenant-alpha", slug: "tenant-alpha", status: "active", branding: { displayName: "Alpha" }, features: {} } as Tenant;

describe("tenant resolver", () => {
  it("resolve somente o slug correspondente e ativo", async () => {
    const lookup = vi.fn(async (slug: string) => slug === activeTenant.slug ? activeTenant : null);
    const resolve = createTenantResolver(lookup);
    await expect(resolve("tenant-alpha")).resolves.toBe(activeTenant);
    await expect(resolve("tenant-beta")).resolves.toBeNull();
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("rejeita slug malformado antes de consultar o serviço", async () => {
    const lookup = vi.fn(async () => activeTenant);
    const resolve = createTenantResolver(lookup);
    await expect(resolve("Tenant Alpha")).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("não retorna tenant suspenso mesmo se o repositório retornar um", async () => {
    const suspended = { ...activeTenant, status: "suspended" } as Tenant;
    const resolve = createTenantResolver(async () => suspended);
    await expect(resolve("tenant-alpha")).resolves.toBeNull();
  });
});

import type { Role } from "@/domain/roles";

export function canAccessTenantAdmin(role: Role | null | undefined): boolean {
  return role === "platform_owner"
    || role === "tenant_owner"
    || role === "tenant_admin"
    || role === "staff"
    || role === "cashier";
}

export function canManageTenant(role: Role | null | undefined): boolean {
  return role === "platform_owner" || role === "tenant_owner";
}

export function isPlatformOwner(role: Role | null | undefined): boolean {
  return role === "platform_owner";
}

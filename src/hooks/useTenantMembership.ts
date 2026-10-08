import { useContext } from "react";
import { TenantMembershipContext } from "@/context/tenantMembershipContextValue";

export function useTenantMembership() {
  const value = useContext(TenantMembershipContext);
  if (!value) throw new Error("useTenantMembership deve ser usado dentro de TenantMembershipProvider");
  return value;
}

import { useContext } from "react";
import { TenantContext } from "@/context/tenantContextValue";

export function useTenant() {
  const value = useContext(TenantContext);
  if (!value) throw new Error("useTenant deve ser usado dentro de TenantProvider");
  return value;
}

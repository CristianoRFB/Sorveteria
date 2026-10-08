import { createContext } from "react";
import type { Tenant } from "@/domain/tenant";

export type TenantContextValue = {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
};

export const TenantContext = createContext<TenantContextValue | null>(null);

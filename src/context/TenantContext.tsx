import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Tenant } from "@/domain/tenant";
import { resolveTenantBySlug } from "@/services/tenantResolver";

type TenantContextValue = {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(Boolean(tenantSlug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!tenantSlug) {
      setTenant(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    resolveTenantBySlug(tenantSlug)
      .then((resolved) => {
        if (!active) return;
        setTenant(resolved);
        if (!resolved) setError("Sorveteria não encontrada ou indisponível.");
      })
      .catch(() => {
        if (!active) return;
        setError("Não foi possível carregar esta sorveteria.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const value = useMemo(() => ({ tenant, loading, error }), [tenant, loading, error]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant deve ser usado dentro de TenantProvider");
  return ctx;
}

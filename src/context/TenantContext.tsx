import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveTenantBySlug } from "@/services/tenantResolver";
import { TenantContext } from "@/context/tenantContextValue";

type Resolution = { slug: string; tenant: Tenant | null; error: string | null };
import type { Tenant } from "@/domain/tenant";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { tenantSlug } = useParams();
  const [resolution, setResolution] = useState<Resolution | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    let active = true;
    resolveTenantBySlug(tenantSlug)
      .then((tenant) => {
        if (active) setResolution({
          slug: tenantSlug,
          tenant,
          error: tenant ? null : "Sorveteria não encontrada, suspensa ou indisponível.",
        });
      })
      .catch((error: unknown) => {
        if (active) setResolution({
          slug: tenantSlug,
          tenant: null,
          error: error instanceof Error ? error.message : "Não foi possível carregar esta sorveteria.",
        });
      });
    return () => { active = false; };
  }, [tenantSlug]);

  const matchesCurrentSlug = Boolean(tenantSlug && resolution?.slug === tenantSlug);
  const value = useMemo(() => ({
    tenant: matchesCurrentSlug ? resolution?.tenant ?? null : null,
    loading: Boolean(tenantSlug) && !matchesCurrentSlug,
    error: matchesCurrentSlug ? resolution?.error ?? null : null,
  }), [tenantSlug, matchesCurrentSlug, resolution]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

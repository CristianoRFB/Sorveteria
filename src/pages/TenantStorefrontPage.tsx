import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useTenant } from "@/context/TenantContext";

export function TenantStorefrontPage() {
  const { tenant, loading, error } = useTenant();

  if (loading) return <LoadingState label="Carregando a sorveteria..." />;
  if (error || !tenant) return <ErrorState message={error ?? "Sorveteria indisponível."} />;

  const style = {
    "--tenant-primary": tenant.branding.primaryColor,
    "--tenant-bg": tenant.branding.backgroundColor,
    "--tenant-text": tenant.branding.textColor,
  } as CSSProperties;

  return (
    <main className="tenant-page" style={style}>
      <section className="tenant-hero">
        <span className="eyebrow">Sorveteria</span>
        <h1>{tenant.branding.displayName}</h1>
        <p>Escolha seus sabores, monte seu pedido e acompanhe tudo por aqui.</p>
        <div className="actions">
          <Link className="button primary" to={`/${tenant.slug}/cardapio`}>Ver cardápio</Link>
          <Link className="button secondary" to={`/${tenant.slug}/acompanhar`}>Acompanhar pedido</Link>
        </div>
      </section>
    </main>
  );
}

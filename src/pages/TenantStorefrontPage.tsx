import { Link } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useTenant } from "@/hooks/useTenant";

export function TenantStorefrontPage() {
  const { tenant, loading, error } = useTenant();

  if (loading) return <LoadingState label="Carregando a sorveteria..." />;
  if (error || !tenant) return <ErrorState message={error ?? "Sorveteria indisponível."} />;

  return (
    <main className="tenant-page">
      <section className="tenant-hero">
        {tenant.branding.logoUrl && <img className="tenant-logo" src={tenant.branding.logoUrl} alt={`Logo ${tenant.branding.displayName}`} />}
        <span className="eyebrow">Sorveteria</span>
        <h1>{tenant.branding.displayName}</h1>
        <p>Escolha seus sabores, monte seu pedido e acompanhe tudo por aqui.</p>
        <div className="actions">
          <Link className="button primary" to={`/${tenant.slug}/cardapio`}>Ver cardápio</Link>
          <Link className="button secondary" to={`/${tenant.slug}/acompanhar`}>Acompanhar pedido</Link>
        </div>
        {tenant.contact?.address && <p className="tenant-contact">{tenant.contact.address}</p>}
        {(tenant.contact?.whatsapp || tenant.contact?.phone) && <p className="tenant-contact">{tenant.contact.whatsapp || tenant.contact.phone}</p>}
      </section>
    </main>
  );
}

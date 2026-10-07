import { useSearchParams } from "react-router-dom";
import { useTenant } from "@/context/TenantContext";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export function TenantMenuPage() {
  const { tenant, loading, error } = useTenant();
  const [params] = useSearchParams();
  const tableId = params.get("table");

  if (loading) return <LoadingState label="Abrindo cardápio..." />;
  if (error || !tenant) return <ErrorState message={error ?? "Cardápio indisponível."} />;

  const tableEnabled = tenant.features.tableOrdering && Boolean(tableId);

  return (
    <main className="content">
      <header>
        <span className="eyebrow">{tenant.branding.displayName}</span>
        <h1>Cardápio</h1>
        {tableEnabled && <p className="notice">Pedido vinculado à mesa {tableId}.</p>}
      </header>
      <section className="state-card">
        <h2>Estrutura pronta para o catálogo</h2>
        <p>
          Produtos, sabores, tamanhos, recipientes e grupos de opções são carregados por tenant.
        </p>
      </section>
    </main>
  );
}

import { useTenant } from "@/context/TenantContext";

export function TenantAdminPage() {
  const { tenant } = useTenant();
  return (
    <main className="content">
      <span className="eyebrow">Painel do negócio</span>
      <h1>{tenant?.branding.displayName ?? "Sorveteria"}</h1>
      <p>Pedidos, catálogo, delivery, QR Codes, caixa, financeiro, equipe e configurações.</p>
      {tenant?.status === "suspended" && (
        <div className="notice" role="alert">Tenant suspenso: operação bloqueada sem exclusão de dados.</div>
      )}
    </main>
  );
}

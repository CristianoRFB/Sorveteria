import { useTenant } from "@/context/TenantContext";

export function TenantTrackingPage() {
  const { tenant } = useTenant();
  return (
    <main className="content">
      <span className="eyebrow">{tenant?.branding.displayName ?? "Sorveteria"}</span>
      <h1>Acompanhar pedido</h1>
      <form className="tracking-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="publicCode">Código do pedido</label>
        <input id="publicCode" name="publicCode" placeholder="Ex.: SV-A7K4P2" autoComplete="off" />
        <button className="button primary" type="submit">Ver pedido</button>
      </form>
      <p className="muted">A consulta pública deve expor apenas status e dados não sensíveis.</p>
    </main>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { findPublicTracking } from "@/services/orderService";
import type { PublicTracking } from "@/domain/tracking";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { createTrackingRequestGate } from "@/domain/trackingRequestGate";

const labels: Record<string, string> = {
  received: "Pedido recebido", confirmed: "Pedido confirmado", preparing: "Em preparo", ready: "Pedido pronto",
  awaiting_driver: "Aguardando entregador", out_for_delivery: "Saiu para entrega", arrived: "Entregador chegou",
  ready_for_pickup: "Pronto para retirada", delivered: "Entregue", picked_up: "Retirado", cancelled: "Cancelado",
};

export function TenantTrackingPage() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [params, setParams] = useSearchParams();
  const urlCode = (params.get("code") || "").trim().toUpperCase();
  // Draft input remains linked to the current URL even after client-side navigation.
  const [draft, setDraft] = useState({ urlCode, value: urlCode });
  const code = draft.urlCode === urlCode ? draft.value : urlCode;
  const requestGate = useRef(createTrackingRequestGate());
  const tenantId = tenant?.id;
  const [retry, setRetry] = useState(0);
  const [lookup, setLookup] = useState<{
    tenantId: string; code: string; retry: number;
    tracking: PublicTracking | null; error: string | null;
  } | null>(null);

  // Effect only synchronizes the external Firestore read. Render-derived state
  // masks old tenant/code results immediately, without synchronous setState.
  useEffect(() => {
    const gate = requestGate.current;
    const token = gate.begin();
    if (!tenantId || !urlCode) return () => { gate.invalidate(); };
    void findPublicTracking(tenantId, urlCode).then((result) => {
      if (!gate.isCurrent(token)) return;
      setLookup({
        tenantId, code: urlCode, retry, tracking: result,
        error: result ? null : "Não encontramos esse pedido nesta sorveteria. Confira o código e tente novamente.",
      });
    }).catch((lookupError: unknown) => {
      if (!gate.isCurrent(token)) return;
      setLookup({
        tenantId, code: urlCode, retry, tracking: null,
        error: lookupError instanceof Error ? lookupError.message : "Não foi possível consultar o pedido agora.",
      });
    });
    return () => { gate.invalidate(); };
  }, [tenantId, urlCode, retry]);

  const activeLookup = lookup?.tenantId === tenantId && lookup?.code === urlCode && lookup?.retry === retry ? lookup : null;
  const loading = Boolean(tenantId && urlCode && !activeLookup);
  const searched = Boolean(urlCode && tenantId);
  const tracking = activeLookup?.tracking ?? null;
  const error = activeLookup?.error ?? null;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant) return;
    const normalized = code.trim().toUpperCase();
    if (normalized === urlCode) setRetry((current) => current + 1);
    else setParams({ code: normalized });
  }

  if (tenantLoading) return <LoadingState label="Carregando loja..." />;
  if (tenantError || !tenant) return <ErrorState message={tenantError ?? "Loja indisponível."} />;
  return <main className="content tracking-content">
    <Link className="back-link" to={`/${tenant.slug}`}>← Voltar à loja</Link>
    <span className="eyebrow">{tenant.branding.displayName}</span><h1>Acompanhar pedido</h1>
    <p className="muted">Informe o código público recebido após finalizar o pedido.</p>
    <form className="tracking-form" onSubmit={(event) => void search(event)}>
      <label htmlFor="publicCode">Código do pedido</label>
      <input id="publicCode" name="publicCode" placeholder="Ex.: SV-A7K4P2Q9" autoComplete="off" maxLength={11} value={code} onChange={(event) => setDraft({ urlCode, value: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} />
      <button className="button primary" type="submit" disabled={loading || code.length < 3}>{loading ? "Consultando..." : "Ver pedido"}</button>
    </form>
    {error && <p className="error-text" role="alert">{error}</p>}
    {searched && !loading && !error && !tracking && <p className="muted">Nenhuma atualização disponível.</p>}
    {tracking && <section className="tracking-result">
      <div className="tracking-result-heading"><div><span className="eyebrow">Pedido {tracking.publicCode}</span><h2>{labels[tracking.status] || tracking.status}</h2></div><span className={`status-pill status-${tracking.status}`}>{labels[tracking.status] || tracking.status}</span></div>
      <p>{tracking.fulfillmentMode === "delivery" ? "Entrega" : "Retirada"}{tracking.estimatedMinutes ? ` · estimativa de ${tracking.estimatedMinutes} minutos` : ""}</p>
      <ol className="tracking-timeline">{tracking.timeline.map((event, index) => <li className={index === tracking.timeline.length - 1 ? "current" : ""} key={`${event.status}-${event.at}-${index}`}><span className="timeline-dot" /><div><strong>{labels[event.status] || event.status}</strong><time>{new Date(event.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time></div></li>)}</ol>
      <p className="form-hint">Esta página mostra apenas o andamento público do pedido. Dados de contato e pagamento não são exibidos.</p>
    </section>}
  </main>;
}

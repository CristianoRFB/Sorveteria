import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import type { DriverDelivery } from "@/services/tenantOperations";
import { loadOrderForDriver, watchDriverDeliveries } from "@/services/tenantOperations";
import { driverDeliveryAction } from "@/services/orderService";
import { LoadingState } from "@/components/LoadingState";

const labels: Record<string, string> = {
  assigned: "Atribuída", out_for_delivery: "Saiu para entrega", arrived: "No endereço", delivered: "Entregue", failed: "Tentativa registrada", cancelled: "Cancelada",
};

export function DriverPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [rows, setRows] = useState<DriverDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant || !user) return;
    return watchDriverDeliveries(tenant.id, user.uid, (deliveries) => {
      setRows(deliveries);
      setLoading(false);
      setError(null);
    }, (watchError) => { setError(watchError.message); setLoading(false); });
  }, [tenant, user]);

  const visibleRows = useMemo(() => rows.filter((delivery) => delivery.status !== "cancelled"), [rows]);

  async function act(delivery: DriverDelivery, action: "start" | "arrive" | "deliver" | "failed") {
    if (!tenant) return;
    setBusyId(delivery.id); setError(null); setNotice(null);
    try {
      await driverDeliveryAction(tenant.id, delivery.id, action, codes[delivery.id]);
      const nextStatus = { start: "out_for_delivery", arrive: "arrived", deliver: "delivered", failed: "failed" }[action];
      setRows((current) => current.map((row) => row.id === delivery.id
        ? { ...row, status: nextStatus, failedAttempts: action === "failed" ? row.failedAttempts + 1 : row.failedAttempts }
        : row));
      if (action === "deliver") setCodes((current) => ({ ...current, [delivery.id]: "" }));
      setNotice(action === "failed" ? "Tentativa de entrega registrada." : action === "deliver" ? "Entrega concluída." : "Entrega atualizada.");
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar a entrega."); }
    finally { setBusyId(null); }
  }

  if (!tenant) return <LoadingState label="Carregando sorveteria..." />;
  if (loading) return <LoadingState label="Carregando entregas atribuídas..." />;
  return <main className="content driver-content">
    <div className="driver-topbar"><Link to={`/${tenant.slug}/painel`}>← Painel</Link><span>{tenant.branding.displayName}</span></div>
    <span className="eyebrow">Área do entregador</span><h1>Minhas entregas</h1>
    <p className="muted">Veja o endereço e atualize cada etapa. A confirmação é informada pelo cliente no momento da entrega.</p>
    {error && <p className="error-text" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {visibleRows.length === 0 ? <div className="empty-state">Nenhuma entrega atribuída no momento.</div> : <div className="driver-delivery-list">{visibleRows.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} tenantId={tenant.id} busy={busyId === delivery.id} code={codes[delivery.id] || ""} setCode={(value) => setCodes((current) => ({ ...current, [delivery.id]: value.toUpperCase() }))} act={act} />)}</div>}
  </main>;
}

function DeliveryCard({ delivery, tenantId, busy, code, setCode, act }: {
  delivery: DriverDelivery; tenantId: string; busy: boolean; code: string;
  setCode: (value: string) => void;
  act: (delivery: DriverDelivery, action: "start" | "arrive" | "deliver" | "failed") => Promise<void>;
}) {
  const [details, setDetails] = useState<Pick<DriverDelivery, "address" | "customer" | "publicCode"> | null>(null);
  useEffect(() => {
    let active = true;
    loadOrderForDriver(tenantId, delivery.orderId).then((value) => { if (active) setDetails(value); }).catch(() => { if (active) setDetails(null); });
    return () => { active = false; };
  }, [tenantId, delivery.orderId]);
  const address = details?.address;
  const mapQuery = address ? [address.street, address.number, address.neighborhood].filter(Boolean).join(", ") : "";
  return <article className="driver-card">
    <header className="order-card-heading"><div><span className="eyebrow">{details?.publicCode || "Entrega"}</span><h2>{details?.customer?.name || "Carregando pedido..."}</h2></div><span className={`status-pill status-${delivery.status}`}>{labels[delivery.status] || delivery.status}</span></header>
    {address && <div className="address-panel"><strong>{address.street}, {address.number}</strong><span>{address.neighborhood}</span>{address.reference && <small>Referência: {address.reference}</small>}{mapQuery && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noreferrer">Abrir rota</a>}</div>}
    {details?.customer?.phone && <a className="phone-link" href={`tel:${details.customer.phone}`}>Ligar para {details.customer.name}</a>}
    <p className="muted">Tentativas registradas: {delivery.failedAttempts}</p>
    <div className="actions">
      {delivery.status === "assigned" && <button className="button primary" disabled={busy} onClick={() => void act(delivery, "start")}>Iniciar entrega</button>}
      {delivery.status === "out_for_delivery" && <><button className="button primary" disabled={busy} onClick={() => void act(delivery, "arrive")}>Cheguei ao endereço</button><button className="button secondary" disabled={busy} onClick={() => void act(delivery, "failed")}>Registrar tentativa sem sucesso</button></>}
      {delivery.status === "arrived" && <><label>Código informado pelo cliente<input autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Z0-9]/g, ""))} /></label><button className="button primary" disabled={busy || code.length < 8} onClick={() => void act(delivery, "deliver")}>Confirmar entrega</button><button className="button secondary" disabled={busy} onClick={() => void act(delivery, "failed")}>Registrar tentativa sem sucesso</button></>}
      {delivery.status === "failed" && <p className="notice">A tentativa foi registrada. A equipe da loja poderá reatribuir esta entrega.</p>}
      {delivery.status === "delivered" && <p className="notice">Entrega concluída.</p>}
    </div>
  </article>;
}

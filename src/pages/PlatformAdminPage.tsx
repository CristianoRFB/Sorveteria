import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { platformAssignTenantPlan, platformCreateTenant, platformEnterTenant, platformSetTenantStatus, type TenantSummary } from "@/services/tenantOperations";
import type { TenantPlanId, TenantSubscriptionStatus } from "@/domain/tenant";
import { sorveteriaPlanCatalog } from "@/domain/entitlements";
import { usingFirebaseEmulators } from "@/lib/firebase";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export function PlatformAdminPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [commercialSelections, setCommercialSelections] = useState<Record<string, { planId: TenantPlanId; status: TenantSubscriptionStatus }>>({});

  useEffect(() => onSnapshot(query(collection(db, "tenants"), orderBy("slug")), (snapshot) => {
    setTenants(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TenantSummary));
    setLoading(false);
    setError(null);
  }, (snapshotError) => {
    setError(snapshotError.message);
    setLoading(false);
  }), []);

  function changeName(value: string) {
    setDisplayName(value);
    setSlug(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await platformCreateTenant({ displayName, slug, ownerEmail: ownerEmail || undefined });
      setDisplayName(""); setSlug(""); setOwnerEmail("");
      setMessage(result.ownerFound
        ? `${displayName} criada e vinculada ao responsável.`
        : `${displayName} criada em onboarding. Nenhuma conta existente foi encontrada para o e-mail informado.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar a sorveteria.");
    } finally {
      setPending(false);
    }
  }

  async function setStatus(tenant: TenantSummary, status: "active" | "suspended") {
    const reason = window.prompt(status === "suspended" ? "Motivo da suspensão (obrigatório):" : "Motivo da reativação (obrigatório):")?.trim();
    if (!reason) return;
    setPending(true); setError(null);
    try {
      await platformSetTenantStatus({ tenantId: tenant.id, status, reason });
      setMessage(`${tenant.branding.displayName}: ${status === "active" ? "ativa" : "suspensa"}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Não foi possível alterar o status.");
    } finally { setPending(false); }
  }

  function selectedCommercialState(tenant: TenantSummary) {
    return commercialSelections[tenant.id] || {
      planId: tenant.subscriptionStatus === "trial" ? "pro" : tenant.planId || "essencial",
      status: tenant.subscriptionStatus || "active",
    };
  }

  function selectCommercialPlan(tenant: TenantSummary, planId: TenantPlanId) {
    const current = selectedCommercialState(tenant);
    setCommercialSelections((selection) => ({
      ...selection,
      [tenant.id]: { planId, status: current.status === "trial" && planId !== "pro" ? "active" : current.status },
    }));
  }

  function selectCommercialStatus(tenant: TenantSummary, status: TenantSubscriptionStatus) {
    const current = selectedCommercialState(tenant);
    setCommercialSelections((selection) => ({
      ...selection,
      [tenant.id]: { planId: status === "trial" ? "pro" : status === "demo" ? "premium" : current.planId, status },
    }));
  }

  async function assignPlan(event: FormEvent<HTMLFormElement>, tenant: TenantSummary) {
    event.preventDefault();
    const selection = selectedCommercialState(tenant);
    const reason = window.prompt("Motivo obrigatório para a atribuição comercial:")?.trim();
    if (!reason) return;
    setPending(true); setError(null); setMessage(null);
    try {
      await platformAssignTenantPlan({ tenantId: tenant.id, planId: selection.planId, subscriptionStatus: selection.status, reason });
      setMessage(`${tenant.branding.displayName}: ${sorveteriaPlanCatalog.plans[selection.planId].name} · ${selection.status}.`);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Não foi possível atribuir o plano.");
    } finally { setPending(false); }
  }

  async function enter(tenant: TenantSummary) {
    setPending(true); setError(null);
    try {
      await platformEnterTenant(tenant.id);
      navigate(`/${tenant.slug}/painel`);
    } catch (enterError) {
      setError(enterError instanceof Error ? enterError.message : "Não foi possível entrar no contexto.");
    } finally { setPending(false); }
  }

  return (
    <main className="content admin-content">
      <span className="eyebrow">Platform Owner</span>
      <h1>Ecossistema de sorveterias</h1>
      <p className="muted">Administração operacional, com suspensão reversível e registro auditável.</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">Operação</span><h2>Sorveterias</h2></div><span className="count-badge">{tenants.length}</span></div>
        {loading ? <LoadingState label="Carregando sorveterias..." /> : error && tenants.length === 0 ? <ErrorState message="Não foi possível carregar a lista." /> : tenants.length === 0 ? <div className="empty-state">Nenhuma sorveteria cadastrada.</div> : (
          <div className="tenant-list">
            {tenants.map((tenant) => (
              <article className="tenant-row" key={tenant.id}>
                <div className="tenant-row-main"><strong>{tenant.branding.displayName}</strong><span>/{tenant.slug}</span><span className={`status-pill status-${tenant.status}`}>{tenant.status}</span></div>
                <p className="muted">Plano: {tenant.planId ? sorveteriaPlanCatalog.plans[tenant.planId].name : "não atribuído"} · assinatura: {tenant.subscriptionStatus || "não atribuída"}{tenant.subscriptionStatus === "trial" && tenant.trialUntil && <span> · avaliação até {new Intl.DateTimeFormat("pt-BR").format(tenant.trialUntil instanceof Date ? tenant.trialUntil : tenant.trialUntil.toDate?.() || new Date(tenant.trialUntil as unknown as string))}</span>}</p>
                <div className="actions compact-actions">
                  {tenant.status === "active" && <button className="button secondary" disabled={pending} onClick={() => void enter(tenant)}>Entrar no contexto</button>}
                  {tenant.status === "active"
                    ? <button className="button danger-button" disabled={pending} onClick={() => void setStatus(tenant, "suspended")}>Suspender</button>
                    : <button className="button secondary" disabled={pending} onClick={() => void setStatus(tenant, "active")}>Ativar</button>}
                </div>
                <form className="commercial-assignment-form" onSubmit={(event) => void assignPlan(event, tenant)}>
                  <label>Plano<select value={selectedCommercialState(tenant).planId} onChange={(event) => selectCommercialPlan(tenant, event.target.value as TenantPlanId)}>
                    {Object.entries(sorveteriaPlanCatalog.plans).map(([id, plan]) => <option key={id} value={id}>{plan.name}</option>)}
                  </select></label>
                  <label>Status da assinatura<select value={selectedCommercialState(tenant).status} onChange={(event) => selectCommercialStatus(tenant, event.target.value as TenantSubscriptionStatus)}>
                    {(["active", "trial", "past_due", "suspended", "cancelled"] as TenantSubscriptionStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                    {usingFirebaseEmulators && <option value="demo">demo local</option>}
                  </select></label>
                  <button className="button secondary" type="submit" disabled={pending}>{pending ? "Salvando..." : "Atribuir plano"}</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">Onboarding</span><h2>Criar sorveteria</h2></div></div>
        <form className="form-grid two-column-form" onSubmit={createTenant}>
          <label>Nome da sorveteria<input required maxLength={120} value={displayName} onChange={(event) => changeName(event.target.value)} /></label>
          <label>Endereço curto<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={64} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} /></label>
          <label className="span-two">E-mail de uma conta existente para ser responsável (opcional)<input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} /></label>
          <p className="form-hint span-two">Se o e-mail ainda não tiver conta, a sorveteria ficará em onboarding. O sistema não envia convites por e-mail.</p>
          <button className="button primary" type="submit" disabled={pending}>{pending ? "Salvando..." : "Criar sorveteria"}</button>
        </form>
      </section>
    </main>
  );
}

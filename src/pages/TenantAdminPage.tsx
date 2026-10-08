import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CatalogCategory, CatalogProduct } from "@/domain/catalog";
import type { Order, OrderStatus } from "@/domain/order";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useTenantMembership } from "@/hooks/useTenantMembership";
import { listCatalog, saveCategory, saveProduct } from "@/services/catalogService";
import { assignDelivery, changeOrderStatus, resetDeliveryConfirmationCode } from "@/services/orderService";
import { addTenantMember, setTenantMemberStatus, watchDrivers, watchOrders, watchTenantDeliveries, watchTenantMembers, type DriverDelivery } from "@/services/tenantOperations";
import type { Membership } from "@/domain/membership";
import { loadTenantSettings, saveTenantSettings, type TenantSettings } from "@/services/tenantSettings";
import { LoadingState } from "@/components/LoadingState";

type Tab = "orders" | "catalog" | "settings";
type OptionDraft = { id: string; name: string; priceDeltaCents: number; available: boolean };
type GroupDraft = { id: string; name: string; required: boolean; minSelections: number; maxSelections: number; options: OptionDraft[] };
type ProductDraft = { name: string; description: string; categoryId: string; kind: CatalogProduct["kind"]; price: string; available: boolean; optionGroups: GroupDraft[] };

const emptyProduct: ProductDraft = { name: "", description: "", categoryId: "", kind: "pot", price: "", available: true, optionGroups: [] };
const orderLabels: Record<OrderStatus, string> = {
  received: "Recebido", confirmed: "Confirmado", preparing: "Em preparo", ready: "Pronto",
  awaiting_driver: "Aguardando entregador", out_for_delivery: "Saiu para entrega", ready_for_pickup: "Pronto para retirada",
  delivered: "Entregue", picked_up: "Retirado", cancelled: "Cancelado",
};
const orderNext: Partial<Record<OrderStatus, OrderStatus[]>> = {
  received: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready", "cancelled"],
  ready: ["ready_for_pickup", "cancelled"], awaiting_driver: ["cancelled"], out_for_delivery: ["cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function newGroup(): GroupDraft {
  return { id: crypto.randomUUID(), name: "Novo grupo", required: false, minSelections: 0, maxSelections: 1, options: [] };
}

function toProductDraft(product: CatalogProduct, categories: CatalogCategory[]): ProductDraft {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId || categories[0]?.id || "",
    kind: product.kind,
    price: (product.priceCents / 100).toFixed(2).replace(".", ","),
    available: product.available,
    optionGroups: product.optionGroups || [],
  };
}

export function TenantAdminPage() {
  const { tenant } = useTenant();
  const { isPlatformOwner } = useAuth();
  const { membership } = useTenantMembership();
  const canManage = isPlatformOwner || membership?.role === "tenant_owner" || membership?.role === "tenant_admin";
  const [tab, setTab] = useState<Tab>("orders");
  if (!tenant) return <LoadingState label="Carregando sorveteria..." />;

  return (
    <main className="content admin-content">
      {isPlatformOwner && <div className="context-banner"><strong>Contexto Platform Owner</strong><span>Você está operando {tenant.branding.displayName}.</span><Link to="/admin">Voltar à plataforma</Link></div>}
      <span className="eyebrow">Painel do negócio</span>
      <h1>{tenant.branding.displayName}</h1>
      <p className="muted">Pedidos, catálogo e configurações da sua sorveteria.</p>
      <div className="admin-nav" role="tablist" aria-label="Seções do painel">
        <button role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Pedidos</button>
        {canManage && <button role="tab" aria-selected={tab === "catalog"} className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}>Catálogo</button>}
        {canManage && <button role="tab" aria-selected={tab === "settings"} className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Checkout e equipe</button>}
        <Link to={`/${tenant.slug}/painel/qr-codes`}>QR do cardápio</Link>
        <Link to={`/${tenant.slug}/cardapio`} target="_blank">Ver loja</Link>
      </div>
      {(!canManage || tab === "orders") && <OrderManager tenantId={tenant.id} canResetDeliveryCode={isPlatformOwner || membership?.role === "tenant_owner"} />}
      {canManage && tab === "catalog" && <CatalogManager tenantId={tenant.id} />}
      {tab === "settings" && canManage && <><SettingsEditor tenantId={tenant.id} /><TeamManager tenantId={tenant.id} /></>}
    </main>
  );
}

function CatalogManager({ tenantId }: { tenantId: string }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [draft, setDraft] = useState<ProductDraft>(emptyProduct);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listCatalog(tenantId);
      setCategories(data.categories);
      setProducts(data.products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setDraft((current) => ({ ...current, categoryId: current.categoryId || data.categories[0]?.id || "" }));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o catálogo.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    listCatalog(tenantId).then((data) => {
      if (!active) return;
      setCategories(data.categories);
      setProducts(data.products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setDraft((current) => ({ ...current, categoryId: current.categoryId || data.categories[0]?.id || "" }));
      setError(null);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o catálogo.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId]);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const id = await saveCategory(tenantId, { name: categoryName, active: true, sortOrder: categories.length });
      setCategoryName("");
      await refresh();
      setDraft((current) => ({ ...current, categoryId: current.categoryId || id }));
      setMessage("Categoria salva.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a categoria."); }
    finally { setPending(false); }
  }

  function changeDraft<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateGroup(groupId: string, update: Partial<GroupDraft>) {
    setDraft((current) => ({ ...current, optionGroups: current.optionGroups.map((group) => group.id === groupId ? { ...group, ...update } : group) }));
  }

  function updateOption(groupId: string, optionId: string, update: Partial<OptionDraft>) {
    setDraft((current) => ({ ...current, optionGroups: current.optionGroups.map((group) => group.id === groupId
      ? { ...group, options: group.options.map((option) => option.id === optionId ? { ...option, ...update } : option) }
      : group) }));
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    try {
      const priceCents = Math.round(Number(draft.price.replace(",", ".")) * 100);
      const input = {
        name: draft.name, description: draft.description, categoryId: draft.categoryId, kind: draft.kind,
        priceCents, available: draft.available, optionGroups: draft.optionGroups,
      };
      await saveProduct(tenantId, input, editingId);
      setMessage(editingId ? "Produto atualizado." : "Produto criado.");
      setEditingId(undefined); setDraft({ ...emptyProduct, categoryId: categories[0]?.id || "" });
      await refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o produto."); }
    finally { setPending(false); }
  }

  function edit(product: CatalogProduct) {
    setEditingId(product.id);
    setDraft(toProductDraft(product, categories));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <LoadingState label="Carregando catálogo..." />;
  return <div className="admin-grid">
    <div className="admin-column">
      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">Organização</span><h2>Categorias</h2></div><span className="count-badge">{categories.length}</span></div>
        {categories.length > 0 && <ul className="simple-list">{categories.map((category) => <li key={category.id}>{category.name}<span>{category.active ? "Ativa" : "Pausada"}</span></li>)}</ul>}
        <form className="inline-form" onSubmit={(event) => void addCategory(event)}>
          <label className="sr-only" htmlFor="category-name">Nome da categoria</label>
          <input id="category-name" required maxLength={80} placeholder="Ex.: Potes e casquinhas" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          <button className="button secondary" disabled={pending}>Adicionar</button>
        </form>
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">Cardápio</span><h2>{editingId ? "Editar produto" : "Novo produto"}</h2></div></div>
        {categories.length === 0 && <p className="notice">Crie uma categoria antes de cadastrar produtos.</p>}
        <form className="form-grid" onSubmit={(event) => void submitProduct(event)}>
          <label>Nome<input required maxLength={120} value={draft.name} onChange={(event) => changeDraft("name", event.target.value)} /></label>
          <label>Descrição<textarea maxLength={1000} rows={2} value={draft.description} onChange={(event) => changeDraft("description", event.target.value)} /></label>
          <div className="form-row">
            <label>Categoria<select required value={draft.categoryId} onChange={(event) => changeDraft("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Tipo<select value={draft.kind} onChange={(event) => changeDraft("kind", event.target.value as CatalogProduct["kind"])}><option value="pot">Pote</option><option value="cone">Casquinha</option><option value="milkshake">Milkshake</option><option value="other">Outro</option></select></label>
          </div>
          <div className="form-row">
            <label>Preço base (R$)<input required inputMode="decimal" placeholder="12,00" value={draft.price} onChange={(event) => changeDraft("price", event.target.value)} /></label>
            <label className="checkbox-label"><input type="checkbox" checked={draft.available} onChange={(event) => changeDraft("available", event.target.checked)} /> Disponível para pedidos</label>
          </div>
          <div className="option-groups-editor">
            <div className="section-heading compact-heading"><div><h3>Personalização</h3><p className="muted">Tamanhos, sabores, recipientes, coberturas e adicionais.</p></div><button className="button secondary" type="button" onClick={() => changeDraft("optionGroups", [...draft.optionGroups, newGroup()])}>Adicionar grupo</button></div>
            {draft.optionGroups.map((group) => <OptionGroupEditor key={group.id} group={group} updateGroup={(value) => updateGroup(group.id, value)} updateOption={(optionId, value) => updateOption(group.id, optionId, value)} remove={() => changeDraft("optionGroups", draft.optionGroups.filter((item) => item.id !== group.id))} />)}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
          <div className="actions"><button className="button primary" type="submit" disabled={pending || categories.length === 0}>{pending ? "Salvando..." : editingId ? "Salvar alterações" : "Criar produto"}</button>{editingId && <button className="button secondary" type="button" onClick={() => { setEditingId(undefined); setDraft({ ...emptyProduct, categoryId: categories[0]?.id || "" }); }}>Cancelar edição</button>}</div>
        </form>
      </section>
    </div>

    <section className="admin-section product-list-section">
      <div className="section-heading"><div><span className="eyebrow">Produtos</span><h2>Catálogo da loja</h2></div><span className="count-badge">{products.length}</span></div>
      {products.length === 0 ? <div className="empty-state">Ainda não há produtos. Cadastre o primeiro para exibi-lo no cardápio.</div> : <div className="product-list">{products.map((product) => <article className="product-admin-row" key={product.id}>
        <div><strong>{product.name}</strong><span>{money(product.priceCents)} · {categories.find((category) => category.id === product.categoryId)?.name ?? "Sem categoria"}</span><small>{product.optionGroups.length ? product.optionGroups.map((group) => group.name).join(" · ") : "Sem opções"}</small></div>
        <div className="product-row-actions"><span className={`status-pill ${product.available ? "status-active" : "status-suspended"}`}>{product.available ? "Disponível" : "Pausado"}</span><button className="text-button" onClick={() => edit(product)}>Editar</button></div>
      </article>)}</div>}
    </section>
  </div>;
}

function OptionGroupEditor({ group, updateGroup, updateOption, remove }: {
  group: GroupDraft;
  updateGroup: (value: Partial<GroupDraft>) => void;
  updateOption: (id: string, value: Partial<OptionDraft>) => void;
  remove: () => void;
}) {
  return <fieldset className="option-group-editor">
    <div className="section-heading compact-heading"><legend>{group.name || "Grupo de opções"}</legend><button className="text-button danger-text" type="button" onClick={remove}>Remover grupo</button></div>
    <label>Nome do grupo<input required maxLength={80} value={group.name} onChange={(event) => updateGroup({ name: event.target.value })} placeholder="Ex.: Sabores" /></label>
    <div className="form-row">
      <label>Mínimo<select value={group.minSelections} onChange={(event) => updateGroup({ minSelections: Number(event.target.value) })}>{Array.from({ length: group.options.length + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
      <label>Máximo<select value={group.maxSelections} onChange={(event) => updateGroup({ maxSelections: Number(event.target.value) })}>{Array.from({ length: group.options.length + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
      <label className="checkbox-label"><input type="checkbox" checked={group.required} onChange={(event) => updateGroup({ required: event.target.checked, minSelections: event.target.checked ? Math.max(1, group.minSelections) : group.minSelections })} /> Obrigatório</label>
    </div>
    <div className="option-draft-list">{group.options.map((option) => <div className="option-draft-row" key={option.id}>
      <input required aria-label="Nome da opção" placeholder="Ex.: Chocolate" value={option.name} onChange={(event) => updateOption(option.id, { name: event.target.value })} />
      <input aria-label="Adicional em reais" inputMode="decimal" placeholder="0,00" value={(option.priceDeltaCents / 100).toFixed(2).replace(".", ",")} onChange={(event) => updateOption(option.id, { priceDeltaCents: Math.max(0, Math.round(Number(event.target.value.replace(",", ".")) * 100) || 0) })} />
      <label className="checkbox-label small-checkbox"><input type="checkbox" checked={option.available} onChange={(event) => updateOption(option.id, { available: event.target.checked })} /> Ativa</label>
      <button className="text-button danger-text" type="button" aria-label={`Remover ${option.name || "opção"}`} onClick={() => updateGroup({ options: group.options.filter((item) => item.id !== option.id), maxSelections: Math.min(group.maxSelections, Math.max(0, group.options.length - 1)), minSelections: Math.min(group.minSelections, Math.max(0, group.options.length - 1)) })}>×</button>
    </div>)}</div>
    <button className="button small-button secondary" type="button" onClick={() => updateGroup({ options: [...group.options, { id: crypto.randomUUID(), name: "", priceDeltaCents: 0, available: true }], maxSelections: Math.max(1, group.maxSelections) })}>Adicionar opção</button>
  </fieldset>;
}

function OrderManager({ tenantId, canResetDeliveryCode }: { tenantId: string; canResetDeliveryCode: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Membership[]>([]);
  const [deliveries, setDeliveries] = useState<DriverDelivery[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => watchOrders(tenantId, (rows) => { setOrders(rows); setLoading(false); setError(null); }, (watchError) => { setError(watchError.message); setLoading(false); }), [tenantId]);
  useEffect(() => watchDrivers(tenantId, setDrivers, (watchError) => setError(watchError.message)), [tenantId]);
  useEffect(() => watchTenantDeliveries(tenantId, setDeliveries, (watchError) => setError(watchError.message)), [tenantId]);

  async function transition(order: Order, status: OrderStatus) {
    const reason = status === "cancelled" ? window.prompt("Motivo do cancelamento:")?.trim() : undefined;
    if (status === "cancelled" && !reason) return;
    setBusyId(order.id); setError(null);
    try { await changeOrderStatus(tenantId, order.id, status, reason); }
    catch (changeError) { setError(changeError instanceof Error ? changeError.message : "Não foi possível atualizar o pedido."); }
    finally { setBusyId(null); }
  }

  async function assign(order: Order) {
    const driverId = selectedDrivers[order.id];
    if (!driverId) { setError("Escolha um entregador ativo."); return; }
    setBusyId(order.id); setError(null);
    try { await assignDelivery(tenantId, order.id, driverId); }
    catch (assignError) { setError(assignError instanceof Error ? assignError.message : "Não foi possível atribuir a entrega."); }
    finally { setBusyId(null); }
  }

  async function resetDeliveryCode(order: Order) {
    const reason = window.prompt("Motivo para redefinir o código de confirmação da entrega:")?.trim();
    if (!reason) return;
    setBusyId(order.id); setError(null);
    try {
      const code = await resetDeliveryConfirmationCode(tenantId, order.id, reason);
      window.alert(`Novo código de confirmação: ${code}\n\nCompartilhe com o cliente por um canal seguro.`);
    } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "Não foi possível redefinir o código."); }
    finally { setBusyId(null); }
  }

  if (loading) return <LoadingState label="Carregando pedidos..." />;
  return <section className="admin-section">
    <div className="section-heading"><div><span className="eyebrow">Operação</span><h2>Pedidos recentes</h2></div><span className="count-badge">{orders.length}</span></div>
    {error && <p role="alert" className="error-text">{error}</p>}
    {orders.length === 0 ? <div className="empty-state">Quando um cliente confirmar um pedido, ele aparecerá aqui.</div> : <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}>
      <header className="order-card-heading"><div><span className="eyebrow">{order.publicCode}</span><h3>{order.customer?.name ?? "Cliente"}</h3></div><span className={`status-pill status-${order.status}`}>{orderLabels[order.status]}</span></header>
      <div className="order-meta"><span>{order.fulfillmentMode === "delivery" ? "Entrega" : "Retirada"}</span><span>{order.customer?.phone}</span><strong>{money(order.money.totalCents)}</strong></div>
      {order.address && <p className="muted">{order.address.street}, {order.address.number} · {order.address.neighborhood}{order.address.reference ? ` · ${order.address.reference}` : ""}</p>}
      <ul className="order-items">{order.items.map((item, index) => <li key={`${item.productId}-${index}`}><span>{item.quantity}× {item.name}{item.selections && Object.keys(item.selections).length > 0 ? ` · ${Object.values(item.selections).flat().join(", ")}` : ""}</span><strong>{money(item.lineTotalCents)}</strong></li>)}</ul>
      {order.status === "ready" && order.fulfillmentMode === "delivery" && <div className="assign-row"><select aria-label="Entregador" value={selectedDrivers[order.id] || ""} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Escolha o entregador</option>{drivers.map((driver) => <option key={driver.id} value={driver.userId}>{driver.userId}</option>)}</select><button className="button secondary" disabled={busyId === order.id} onClick={() => void assign(order)}>Atribuir entrega</button></div>}
      {canResetDeliveryCode && ["awaiting_driver", "out_for_delivery"].includes(order.status)
        && (deliveries.find((delivery) => delivery.orderId === order.id)?.confirmationFailures || 0) >= 5
        && <button className="button secondary" disabled={busyId === order.id} onClick={() => void resetDeliveryCode(order)}>Redefinir código de confirmação</button>}
      <div className="actions compact-actions">{(orderNext[order.status] || []).map((next) => <button key={next} className={next === "cancelled" ? "button secondary" : "button primary"} disabled={busyId === order.id} onClick={() => void transition(order, next)}>{next === "cancelled" ? "Cancelar pedido" : `Marcar: ${orderLabels[next]}`}</button>)}</div>
    </article>)}</div>}
  </section>;
}

function SettingsEditor({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadTenantSettings(tenantId).then((value) => { if (active) setSettings(value); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Falha ao carregar configurações."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId]);
  if (loading) return <LoadingState label="Carregando checkout..." />;
  if (!settings) return <p role="alert" className="error-text">{error ?? "Configurações indisponíveis."}</p>;
  function change<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) { setSettings((current) => current ? { ...current, [key]: value } : current); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    const current = settings;
    if (!current) return;
    try { await saveTenantSettings(tenantId, current); setMessage("Configurações do checkout salvas."); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar."); }
    finally { setPending(false); }
  }
  return <section className="admin-section settings-section">
    <span className="eyebrow">Checkout essencial</span><h2>Entrega, estimativa e pagamento</h2>
    <form className="form-grid settings-form" onSubmit={(event) => void save(event)}>
      <div className="form-row"><label>Taxa de entrega (R$)<input inputMode="decimal" value={(settings.deliveryFeeCents / 100).toFixed(2).replace(".", ",")} onChange={(event) => change("deliveryFeeCents", Math.max(0, Math.round(Number(event.target.value.replace(",", ".")) * 100) || 0))} /></label><label>Estimativa (minutos)<input type="number" min={1} max={600} value={settings.estimatedMinutes} onChange={(event) => change("estimatedMinutes", Number(event.target.value))} /></label></div>
      <div className="payment-method-list"><h3>Formas de pagamento aceitas</h3>{settings.paymentMethods.map((method, index) => <div className="payment-method-row" key={method.id}><label className="checkbox-label"><input type="checkbox" checked={method.enabled} onChange={(event) => change("paymentMethods", settings.paymentMethods.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item))} />{method.label}</label><input aria-label={`Instruções para ${method.label}`} placeholder="Instruções opcionais" value={method.instructions || ""} onChange={(event) => change("paymentMethods", settings.paymentMethods.map((item, i) => i === index ? { ...item, instructions: event.target.value } : item))} /></div>)}</div>
      {error && <p role="alert" className="error-text">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
      <button className="button primary" disabled={pending}>{pending ? "Salvando..." : "Salvar configurações"}</button>
    </form>
  </section>;
}

function TeamManager({ tenantId }: { tenantId: string }) {
  const { membership } = useTenantMembership();
  const { isPlatformOwner } = useAuth();
  const [members, setMembers] = useState<Membership[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "cashier" | "driver" | "tenant_admin">("staff");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canAssignAdmin = isPlatformOwner || membership?.role === "tenant_owner";

  useEffect(() => watchTenantMembers(tenantId, (rows) => { setMembers(rows); setLoading(false); setError(null); }, (watchError) => { setError(watchError.message); setLoading(false); }), [tenantId]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    try {
      await addTenantMember({ tenantId, email, role });
      setEmail(""); setMessage("A pessoa foi vinculada à sorveteria.");
    } catch (addError) { setError(addError instanceof Error ? addError.message : "Não foi possível adicionar a pessoa."); }
    finally { setPending(false); }
  }

  async function changeStatus(member: Membership) {
    const status = member.status === "active" ? "inactive" : "active";
    const reason = window.prompt(status === "inactive" ? "Motivo para desativar este acesso:" : "Motivo para reativar este acesso:")?.trim();
    if (!reason) return;
    setPending(true); setError(null);
    try {
      await setTenantMemberStatus({ tenantId, userId: member.userId, status, reason });
      setMessage(`${member.email || member.userId}: acesso ${status === "active" ? "reativado" : "desativado"}.`);
    } catch (changeError) { setError(changeError instanceof Error ? changeError.message : "Não foi possível alterar o acesso."); }
    finally { setPending(false); }
  }

  return <section className="admin-section team-section">
    <div className="section-heading"><div><span className="eyebrow">Equipe</span><h2>Contas vinculadas</h2></div><span className="count-badge">{members.length}</span></div>
    <p className="form-hint">A conta precisa existir na autenticação. O sistema não envia convites por e-mail.</p>
    <form className="inline-form team-form" onSubmit={(event) => void add(event)}>
      <label className="sr-only" htmlFor="member-email">E-mail da conta existente</label><input id="member-email" type="email" required placeholder="E-mail da conta existente" value={email} onChange={(event) => setEmail(event.target.value)} />
      <label className="sr-only" htmlFor="member-role">Perfil</label><select id="member-role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="staff">Equipe</option><option value="cashier">Caixa</option><option value="driver">Entregador</option>{canAssignAdmin && <option value="tenant_admin">Administrador</option>}</select>
      <button className="button secondary" disabled={pending}>Adicionar</button>
    </form>
    {error && <p className="error-text" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
    {loading ? <LoadingState label="Carregando equipe..." /> : <div className="team-list">{members.map((member) => <article className="team-row" key={member.id}>
      <div><strong>{member.displayName || member.email || member.userId}</strong><span>{member.email || member.userId}</span></div><span>{member.role === "tenant_owner" ? "Responsável" : member.role === "tenant_admin" ? "Administrador" : member.role === "driver" ? "Entregador" : member.role === "cashier" ? "Caixa" : member.role === "customer" ? "Cliente" : "Equipe"}</span>
      {member.role !== "tenant_owner" && member.role !== "customer" && <button className="text-button" disabled={pending} onClick={() => void changeStatus(member)}>{member.status === "active" ? "Desativar" : "Reativar"}</button>}
      {member.role === "tenant_owner" && <span className="status-pill status-active">Responsável principal</span>}
    </article>)}</div>}
  </section>;
}

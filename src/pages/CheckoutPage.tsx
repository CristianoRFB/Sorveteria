import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useCart } from "@/hooks/useCart";
import { cartSubtotal } from "@/domain/cart";
import { createOrder, type CreatedOrder } from "@/services/orderService";
import { loadTenantSettings, type TenantSettings } from "@/services/tenantSettings";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CheckoutPage() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const { items, clear } = useCart();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const submittingRef = useRef(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">("pickup");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [address, setAddress] = useState({ street: "", number: "", neighborhood: "", reference: "" });
  const [paymentMethodId, setPaymentMethodId] = useState("");

  useEffect(() => {
    if (!tenant) return;
    let active = true;
    loadTenantSettings(tenant.id).then((value) => {
      if (!active) return;
      setSettings(value);
      setPaymentMethodId(value.paymentMethods.find((method) => method.enabled)?.id || "");
      setFulfillmentMode(tenant.features.delivery ? "delivery" : "pickup");
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o checkout."); })
      .finally(() => { if (active) setLoadingSettings(false); });
    return () => { active = false; };
  }, [tenant]);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const fee = fulfillmentMode === "delivery" ? settings?.deliveryFeeCents ?? 0 : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !tenant || !settings || items.length === 0) return;
    submittingRef.current = true;
    setPending(true); setError(null);
    try {
      const order = await createOrder({
        tenantId: tenant.id,
        fulfillmentMode,
        customer,
        ...(fulfillmentMode === "delivery" ? { address } : {}),
        paymentMethodId,
        items,
      });
      clear();
      setCreatedOrder(order);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível confirmar o pedido.");
    } finally { submittingRef.current = false; setPending(false); }
  }

  if (tenantLoading) return <LoadingState label="Preparando checkout..." />;
  if (tenantError || !tenant) return <ErrorState message={tenantError ?? "Sorveteria indisponível."} />;
  if (loadingSettings) return <LoadingState label="Preparando checkout..." />;
  if (createdOrder) return <main className="content checkout-content"><section className="confirmation-card">
    <span className="success-mark" aria-hidden="true">✓</span><span className="eyebrow">Pedido recebido</span><h1>Obrigado, {customer.name}!</h1>
    <p>A sorveteria recebeu seu pedido. Guarde o código para acompanhar o andamento.</p>
    <div className="code-panel"><small>Código público do pedido</small><strong>{createdOrder.publicCode}</strong><Link to={`/${tenant.slug}/acompanhar?code=${createdOrder.publicCode}`}>Acompanhar pedido</Link></div>
    {createdOrder.deliveryCode && <div className="delivery-code-notice"><strong>Código de confirmação da entrega</strong><span>{createdOrder.deliveryCode}</span><p>Mostre este código ao entregador quando seu pedido chegar. Ele é diferente do código de acompanhamento.</p></div>}
    {settings && settings.paymentMethods.find((method) => method.id === paymentMethodId)?.instructions && <div className="notice"><strong>Pagamento:</strong> {settings.paymentMethods.find((method) => method.id === paymentMethodId)?.instructions}</div>}
    <Link className="button secondary" to={`/${tenant.slug}`}>Voltar à loja</Link>
  </section></main>;

  if (items.length === 0) return <main className="content checkout-content"><div className="empty-state"><h1>Seu carrinho está vazio</h1><Link className="button primary" to={`/${tenant.slug}/cardapio`}>Voltar ao cardápio</Link></div></main>;
  if (!settings) return <main className="content"><p className="error-text" role="alert">{error ?? "Checkout indisponível."}</p><Link to={`/${tenant.slug}/carrinho`}>Voltar ao carrinho</Link></main>;

  const enabledPayments = settings.paymentMethods.filter((method) => method.enabled);
  return <main className="content checkout-content">
    <Link className="back-link" to={`/${tenant.slug}/carrinho`}>← Voltar ao carrinho</Link>
    <span className="eyebrow">{tenant.branding.displayName}</span><h1>Finalizar pedido</h1>
    <form className="checkout-layout" onSubmit={(event) => void submit(event)}>
      <div className="checkout-main">
        <section className="checkout-section"><span className="step-number">1</span><div><h2>Como receber?</h2><div className="choice-cards">
          {tenant.features.pickup && <label className={`choice-card ${fulfillmentMode === "pickup" ? "selected" : ""}`}><input type="radio" name="fulfillment" value="pickup" checked={fulfillmentMode === "pickup"} onChange={() => setFulfillmentMode("pickup")} /><span><strong>Retirar na loja</strong><small>Sem taxa de entrega</small></span></label>}
          {tenant.features.delivery && <label className={`choice-card ${fulfillmentMode === "delivery" ? "selected" : ""}`}><input type="radio" name="fulfillment" value="delivery" checked={fulfillmentMode === "delivery"} onChange={() => setFulfillmentMode("delivery")} /><span><strong>Receber em casa</strong><small>Taxa: {money(settings.deliveryFeeCents)}</small></span></label>}
        </div></div></section>
        <section className="checkout-section"><span className="step-number">2</span><div className="checkout-fields"><h2>Seus dados</h2><label>Nome<input required maxLength={120} autoComplete="name" value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} /></label><label>Telefone<input required maxLength={40} type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} /></label>
          {fulfillmentMode === "delivery" && <div className="address-fields"><h3>Endereço de entrega</h3><label>Rua<input required maxLength={160} autoComplete="address-line1" value={address.street} onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))} /></label><div className="form-row"><label>Número<input required maxLength={32} value={address.number} onChange={(event) => setAddress((current) => ({ ...current, number: event.target.value }))} /></label><label>Bairro<input required maxLength={100} autoComplete="address-level3" value={address.neighborhood} onChange={(event) => setAddress((current) => ({ ...current, neighborhood: event.target.value }))} /></label></div><label>Referência (opcional)<input maxLength={180} value={address.reference} onChange={(event) => setAddress((current) => ({ ...current, reference: event.target.value }))} /></label></div>}
        </div></section>
        <section className="checkout-section"><span className="step-number">3</span><div><h2>Pagamento</h2>{enabledPayments.length === 0 ? <p className="error-text">A loja ainda não configurou formas de pagamento.</p> : <div className="payment-choice-list">{enabledPayments.map((method) => <label className="payment-choice" key={method.id}><input required type="radio" name="payment" value={method.id} checked={paymentMethodId === method.id} onChange={() => setPaymentMethodId(method.id)} /><span><strong>{method.label}</strong>{method.instructions && <small>{method.instructions}</small>}</span></label>)}</div>}</div></section>
      </div>
      <aside className="checkout-summary"><h2>Revisão do pedido</h2><ul>{items.map((item) => <li key={item.lineId}><span>{item.quantity}× {item.name}</span><strong>{money(item.unitPriceCents * item.quantity)}</strong></li>)}</ul><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{fulfillmentMode === "delivery" && <div><span>Entrega</span><strong>{money(settings.deliveryFeeCents)}</strong></div>}<div className="checkout-total"><span>Total estimado</span><strong>{money(subtotal + fee)}</strong></div><p className="form-hint">Os preços e a disponibilidade são conferidos novamente pela sorveteria ao receber o pedido.</p>{error && <p className="error-text" role="alert">{error}</p>}<button className="button primary full-width" type="submit" disabled={pending || enabledPayments.length === 0}>{pending ? "Enviando pedido..." : "Confirmar pedido"}</button></aside>
    </form>
  </main>;
}

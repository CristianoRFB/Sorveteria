import { Link } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useCart } from "@/hooks/useCart";
import { cartSubtotal } from "@/domain/cart";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CartPage() {
  const { tenant, loading, error } = useTenant();
  const { items, setQuantity, removeItem } = useCart();
  if (loading) return <LoadingState label="Carregando carrinho..." />;
  if (error || !tenant) return <ErrorState message={error ?? "Sorveteria indisponível."} />;
  const subtotal = cartSubtotal(items);
  return <main className="content cart-content">
    <Link className="back-link" to={`/${tenant.slug}/cardapio`}>← Voltar ao cardápio</Link>
    <span className="eyebrow">{tenant.branding.displayName}</span><h1>Seu carrinho</h1>
    {items.length === 0 ? <section className="empty-state"><h2>Seu carrinho está vazio</h2><p>Escolha algo gostoso no cardápio para continuar.</p><Link className="button primary" to={`/${tenant.slug}/cardapio`}>Ver cardápio</Link></section> : <>
      <div className="cart-list">{items.map((item) => <article className="cart-row" key={item.lineId}>
        <div className="cart-item-info"><strong>{item.name}</strong>{item.selectedNames.length > 0 && <small>{item.selectedNames.join(" · ")}</small>}<span>{money(item.unitPriceCents)} cada</span></div>
        <div className="quantity-controls"><button aria-label={`Diminuir ${item.name}`} onClick={() => setQuantity(item.lineId, item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label={`Aumentar ${item.name}`} onClick={() => setQuantity(item.lineId, item.quantity + 1)}>+</button></div>
        <strong className="line-total">{money(item.unitPriceCents * item.quantity)}</strong>
        <button className="text-button danger-text remove-line" onClick={() => removeItem(item.lineId)}>Remover</button>
      </article>)}</div>
      <section className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p className="muted">A taxa de entrega, quando aplicável, será exibida no checkout.</p><Link className="button primary full-width" to={`/${tenant.slug}/checkout`}>Continuar para checkout</Link></section>
    </>}
  </main>;
}

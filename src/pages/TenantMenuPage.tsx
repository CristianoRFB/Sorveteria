import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogCategory, CatalogProduct, ProductSelection } from "@/domain/catalog";
import { selectedProductPrice, validateProductSelection } from "@/domain/catalog";
import { useCart } from "@/hooks/useCart";
import { useTenant } from "@/hooks/useTenant";
import { listPublicCatalog } from "@/services/catalogService";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function TenantMenuPage() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const { items, addItem } = useCart();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selections, setSelections] = useState<ProductSelection>({});
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    let active = true;
    listPublicCatalog(tenant.id).then((catalog) => {
      if (!active) return;
      setCategories(catalog.categories.filter((category) => category.active).sort((a, b) => a.sortOrder - b.sortOrder));
      setProducts(catalog.products.filter((product) => product.available));
      setError(null);
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o cardápio."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenant]);

  const visibleProducts = useMemo(() => activeCategory === "all"
    ? products
    : products.filter((product) => product.categoryId === activeCategory), [activeCategory, products]);

  if (tenantLoading) return <LoadingState label="Abrindo cardápio..." />;
  if (tenantError || !tenant) return <ErrorState message={tenantError ?? "Cardápio indisponível."} />;
  if (loading) return <LoadingState label="Carregando produtos..." />;
  if (!tenant.features.onlineMenu) return <ErrorState message="O cardápio online está temporariamente indisponível." />;

  function openProduct(product: CatalogProduct) {
    setSelectedProduct(product);
    setSelections({});
    setSelectionError(null);
  }

  function toggleOption(groupId: string, optionId: string, maxSelections: number) {
    setSelections((current) => {
      const selected = current[groupId] || [];
      if (selected.includes(optionId)) return { ...current, [groupId]: selected.filter((id) => id !== optionId) };
      if (maxSelections === 1) return { ...current, [groupId]: [optionId] };
      if (selected.length >= maxSelections) return current;
      return { ...current, [groupId]: [...selected, optionId] };
    });
  }

  function addSelectedProduct() {
    if (!selectedProduct) return;
    const issue = validateProductSelection(selectedProduct.optionGroups || [], selections);
    if (issue) { setSelectionError(issue); return; }
    addItem(selectedProduct, selections);
    setSelectedProduct(null);
    setNotice(`${selectedProduct.name} adicionado ao carrinho.`);
    window.setTimeout(() => setNotice(null), 3000);
  }

  return <main className="content menu-content">
    <header className="menu-heading"><div><span className="eyebrow">{tenant.branding.displayName}</span><h1>Cardápio</h1><p className="muted">Escolha o produto e personalize do seu jeito.</p></div><Link className="button secondary cart-button" to={`/${tenant.slug}/carrinho`}>Carrinho <span>{items.reduce((total, item) => total + item.quantity, 0)}</span></Link></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <ErrorState message={error} />}
    {categories.length > 0 && <nav className="category-chips" aria-label="Categorias"><button className={activeCategory === "all" ? "selected" : ""} onClick={() => setActiveCategory("all")}>Tudo</button>{categories.map((category) => <button className={activeCategory === category.id ? "selected" : ""} key={category.id} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}</nav>}
    {products.length === 0 ? <section className="empty-state"><h2>Cardápio em preparo</h2><p>A loja ainda não publicou produtos. Volte mais tarde.</p></section> : visibleProducts.length === 0 ? <div className="empty-state">Nenhum produto disponível nesta categoria.</div> : <section className="menu-product-grid" aria-label="Produtos">{visibleProducts.map((product) => <article className="menu-product-card" key={product.id}>
      <div className={`product-art product-art-${product.kind}`} aria-hidden="true"><span>{product.kind === "cone" ? "◒" : product.kind === "milkshake" ? "◒" : "◉"}</span></div>
      <div className="menu-product-details"><span className="category-label">{categories.find((category) => category.id === product.categoryId)?.name}</span><h2>{product.name}</h2><p>{product.description || "Preparado na hora com os sabores da casa."}</p><div className="product-card-footer"><strong>{money(product.priceCents)}</strong><button className="button primary" onClick={() => openProduct(product)}>{product.optionGroups.length ? "Personalizar" : "Adicionar"}</button></div></div>
    </article>)}</section>}
    {selectedProduct && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
      <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="customize-title">
        <button className="modal-close text-button" aria-label="Fechar" onClick={() => setSelectedProduct(null)}>×</button>
        <span className="eyebrow">Personalizar pedido</span><h2 id="customize-title">{selectedProduct.name}</h2><p>{selectedProduct.description}</p>
        {selectedProduct.optionGroups.map((group) => <fieldset className="menu-option-group" key={group.id}>
          <legend>{group.name} <small>{group.minSelections > 0 ? `Escolha ${group.minSelections === group.maxSelections ? group.minSelections : `de ${group.minSelections} a ${group.maxSelections}`}` : "Opcional"}</small></legend>
          {group.options.filter((option) => option.available).map((option) => {
            const checked = (selections[group.id] || []).includes(option.id);
            return <label className="menu-option" key={option.id}><input type={group.maxSelections === 1 ? "radio" : "checkbox"} name={`group-${group.id}`} checked={checked} onChange={() => toggleOption(group.id, option.id, group.maxSelections)} /><span>{option.name}</span><span>{option.priceDeltaCents > 0 ? `+ ${money(option.priceDeltaCents)}` : ""}</span></label>;
          })}
        </fieldset>)}
        {selectionError && <p className="error-text" role="alert">{selectionError}</p>}
        <button className="button primary full-width" onClick={addSelectedProduct}>Adicionar ao carrinho · {money(selectedProductPrice(selectedProduct, selections))}</button>
      </section>
    </div>}
  </main>;
}

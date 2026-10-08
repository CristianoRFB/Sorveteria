import type { CatalogProduct, ProductSelection } from "./catalog";
import { selectedProductPrice } from "./catalog";

export type CartItem = {
  lineId: string;
  productId: string;
  name: string;
  kind: CatalogProduct["kind"];
  quantity: number;
  selections: ProductSelection;
  selectedNames: string[];
  unitPriceCents: number;
};

export function makeCartItem(product: CatalogProduct, selections: ProductSelection, quantity = 1): CartItem {
  const selectedNames = product.optionGroups.flatMap((group) => {
    const chosen = new Set(selections[group.id] ?? []);
    return group.options.filter((option) => chosen.has(option.id)).map((option) => `${group.name}: ${option.name}`);
  });
  const signature = JSON.stringify(Object.fromEntries(Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))));
  return {
    lineId: `${product.id}:${signature}`,
    productId: product.id,
    name: product.name,
    kind: product.kind,
    quantity,
    selections,
    selectedNames,
    unitPriceCents: selectedProductPrice(product, selections),
  };
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
}

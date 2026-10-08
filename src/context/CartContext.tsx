import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogProduct, ProductSelection } from "@/domain/catalog";
import { makeCartItem, type CartItem } from "@/domain/cart";
import { useTenant } from "@/hooks/useTenant";
import { CartContext } from "@/context/cartContextValue";

function readCart(tenantId: string | undefined): CartItem[] {
  if (!tenantId || typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(`sorveteria-cart:${tenantId}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as { tenantId?: string; items?: CartItem[] };
    return parsed.tenantId === tenantId && Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [items, setItems] = useState<CartItem[]>(() => readCart(tenantId));

  useEffect(() => {
    if (tenantId && typeof window !== "undefined") {
      window.localStorage.setItem(`sorveteria-cart:${tenantId}`, JSON.stringify({ tenantId, items }));
    }
  }, [tenantId, items]);

  const update = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setItems((current) => updater(current));
  }, []);

  const addItem = useCallback((product: CatalogProduct, selections: ProductSelection) => {
    const nextItem = makeCartItem(product, selections);
    update((current) => {
      const existing = current.find((item) => item.lineId === nextItem.lineId);
      return existing
        ? current.map((item) => item.lineId === nextItem.lineId ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, nextItem];
    });
  }, [update]);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    update((current) => quantity <= 0
      ? current.filter((item) => item.lineId !== lineId)
      : current.map((item) => item.lineId === lineId ? { ...item, quantity: Math.min(99, Math.floor(quantity)) } : item));
  }, [update]);
  const removeItem = useCallback((lineId: string) => update((itemsNow) => itemsNow.filter((item) => item.lineId !== lineId)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(() => ({ items, addItem, setQuantity, removeItem, clear }),
    [items, addItem, setQuantity, removeItem, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

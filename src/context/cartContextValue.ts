import { createContext } from "react";
import type { CatalogProduct, ProductSelection } from "@/domain/catalog";
import type { CartItem } from "@/domain/cart";

export type CartContextValue = {
  items: CartItem[];
  addItem: (product: CatalogProduct, selections: ProductSelection) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

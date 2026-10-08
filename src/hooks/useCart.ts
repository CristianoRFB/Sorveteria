import { useContext } from "react";
import { CartContext } from "@/context/cartContextValue";

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart deve ser usado dentro de CartProvider");
  return value;
}

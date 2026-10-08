import { describe, expect, it } from "vitest";
import { cartSubtotal, makeCartItem } from "@/domain/cart";
import type { CatalogProduct } from "@/domain/catalog";

const product: CatalogProduct = {
  id: "milkshake", name: "Milk-shake", description: "", categoryId: "drinks", kind: "milkshake", priceCents: 1500, available: true,
  optionGroups: [{ id: "size", name: "Tamanho", required: true, minSelections: 1, maxSelections: 1,
    options: [{ id: "large", name: "Grande", priceDeltaCents: 500, available: true }] }],
};

describe("carrinho tenant-scoped", () => {
  it("forma uma linha estável pela personalização escolhida", () => {
    const first = makeCartItem(product, { size: ["large"] });
    const second = makeCartItem(product, { size: ["large"] });
    expect(first.lineId).toBe(second.lineId);
    expect(first.unitPriceCents).toBe(2000);
    expect(first.selectedNames).toEqual(["Tamanho: Grande"]);
  });

  it("calcula subtotal por quantidade sem confiar nele para o pedido final", () => {
    const item = { ...makeCartItem(product, { size: ["large"] }), quantity: 3 };
    expect(cartSubtotal([item])).toBe(6000);
  });
});

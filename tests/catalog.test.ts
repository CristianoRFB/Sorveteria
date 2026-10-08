import { describe, expect, it } from "vitest";
import { selectedProductPrice, validateProductSelection, type CatalogProduct } from "@/domain/catalog";
import { catalogProductSchema } from "@/schemas/catalog";

const product: CatalogProduct = {
  id: "pot", name: "Pote", description: "", categoryId: "gelatos", kind: "pot", priceCents: 1200, available: true,
  optionGroups: [
    { id: "size", name: "Tamanho", required: true, minSelections: 1, maxSelections: 1, options: [
      { id: "small", name: "Pequeno", priceDeltaCents: 0, available: true },
      { id: "large", name: "Grande", priceDeltaCents: 600, available: true },
    ] },
    { id: "flavors", name: "Sabores", required: true, minSelections: 1, maxSelections: 2, options: [
      { id: "chocolate", name: "Chocolate", priceDeltaCents: 0, available: true },
      { id: "strawberry", name: "Morango", priceDeltaCents: 0, available: true },
    ] },
  ],
};

describe("catálogo e composição de sorveteria", () => {
  it("valida tamanho, sabores múltiplos e adicionais no preço de apresentação", () => {
    const selections = { size: ["large"], flavors: ["chocolate", "strawberry"] };
    expect(validateProductSelection(product.optionGroups, selections)).toBeNull();
    expect(selectedProductPrice(product, selections)).toBe(1800);
  });

  it("rejeita escolhas abaixo do mínimo, acima do máximo e indisponíveis", () => {
    expect(validateProductSelection(product.optionGroups, { size: [], flavors: ["chocolate"] })).toContain("Tamanho");
    expect(validateProductSelection(product.optionGroups, { size: ["small", "large"], flavors: ["chocolate"] })).toContain("Tamanho");
    expect(validateProductSelection(product.optionGroups, { size: ["small"], flavors: ["unknown"] })).toContain("Sabores");
  });

  it("valida limites de seleção e valores no schema do administrador", () => {
    expect(catalogProductSchema.safeParse({
      name: "Pote", description: "", categoryId: "gelatos", kind: "pot", priceCents: 1200, available: true,
      optionGroups: [{ id: "size", name: "Tamanho", required: true, minSelections: 2, maxSelections: 1, options: [] }],
    }).success).toBe(false);
  });
});

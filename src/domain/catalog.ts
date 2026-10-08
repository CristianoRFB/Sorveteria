export type CatalogKind = "pot" | "cone" | "milkshake" | "other";

export type CatalogOption = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
};

export type CatalogOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: CatalogOption[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  kind: CatalogKind;
  priceCents: number;
  available: boolean;
  optionGroups: CatalogOptionGroup[];
  imageUrl?: string;
};

export type ProductSelection = Record<string, string[]>;

export function validateProductSelection(
  groups: CatalogOptionGroup[],
  selections: ProductSelection,
): string | null {
  for (const group of groups) {
    const chosen = selections[group.id] ?? [];
    const availableIds = new Set(group.options.filter((option) => option.available).map((option) => option.id));
    if (chosen.some((id) => !availableIds.has(id))) return `Uma opção de ${group.name} não está disponível.`;
    if (chosen.length < group.minSelections || chosen.length > group.maxSelections) {
      return `Escolha ${group.minSelections === group.maxSelections
        ? group.minSelections
        : `de ${group.minSelections} a ${group.maxSelections}`} opção(ões) em ${group.name}.`;
    }
    if (new Set(chosen).size !== chosen.length) return `A opção ${group.name} foi selecionada mais de uma vez.`;
  }
  return null;
}

export function selectedProductPrice(product: CatalogProduct, selections: ProductSelection): number {
  const extra = product.optionGroups.reduce((sum, group) => {
    const selected = new Set(selections[group.id] ?? []);
    return sum + group.options.reduce((groupSum, option) =>
      groupSum + (selected.has(option.id) ? option.priceDeltaCents : 0), 0);
  }, 0);
  return product.priceCents + extra;
}

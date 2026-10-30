import { httpsCallable } from "firebase/functions";
import type { CatalogCategory, CatalogProduct } from "@/domain/catalog";
import { catalogCategorySchema, catalogProductSchema, type CatalogCategoryInput, type CatalogProductInput } from "@/schemas/catalog";
import { functions } from "@/lib/firebase";
import { collectCatalogPages } from "@/domain/catalogPagination";

type CatalogPage = {categories:CatalogCategory[];products:CatalogProduct[];nextCursor:string|null};

export async function listCatalog(tenantId: string): Promise<{categories:CatalogCategory[];products:CatalogProduct[]}> {
  const call=httpsCallable<{tenantId:string;cursor:string|null},CatalogPage>(
    functions,"getTenantAdminCatalog",{timeout:20_000},
  );
  return collectCatalogPages(async cursor=>(await call({tenantId,cursor})).data);
}

export async function listPublicCatalog(tenantId: string): Promise<{categories:CatalogCategory[];products:CatalogProduct[]}> {
  const call=httpsCallable<{tenantId:string;cursor:string|null},CatalogPage>(
    functions,"getPublicCatalog",{timeout:20_000},
  );
  return collectCatalogPages(async cursor=>(await call({tenantId,cursor})).data);
}

export async function saveCategory(tenantId: string, input: CatalogCategoryInput, id?: string): Promise<string> {
  const value = catalogCategorySchema.parse(input);
  const call = httpsCallable<{ tenantId: string; category: CatalogCategoryInput; categoryId?: string }, { id: string }>(functions, "saveCatalogCategory");
  return (await call({ tenantId, category: value, categoryId: id })).data.id;
}

export async function saveProduct(tenantId: string, input: CatalogProductInput, id?: string): Promise<string> {
  const value = catalogProductSchema.parse(input);
  const call = httpsCallable<{ tenantId: string; product: CatalogProductInput; productId?: string }, { id: string }>(functions, "saveCatalogProduct");
  return (await call({ tenantId, product: value, productId: id })).data.id;
}

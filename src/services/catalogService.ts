import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { CatalogCategory, CatalogProduct } from "@/domain/catalog";
import { catalogCategorySchema, catalogProductSchema, type CatalogCategoryInput, type CatalogProductInput } from "@/schemas/catalog";
import { db, functions } from "@/lib/firebase";

export async function listCatalog(tenantId: string): Promise<{ categories: CatalogCategory[]; products: CatalogProduct[] }> {
  const [categorySnapshots, productSnapshots] = await Promise.all([
    getDocs(query(collection(db, "tenants", tenantId, "categories"), orderBy("sortOrder"))),
    getDocs(collection(db, "tenants", tenantId, "products")),
  ]);
  return {
    categories: categorySnapshots.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as CatalogCategory),
    products: productSnapshots.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as CatalogProduct),
  };
}

export async function listPublicCatalog(tenantId: string): Promise<{ categories: CatalogCategory[]; products: CatalogProduct[] }> {
  const [categorySnapshots, productSnapshots] = await Promise.all([
    getDocs(query(collection(db, "tenants", tenantId, "categories"), where("active", "==", true), orderBy("sortOrder"))),
    getDocs(query(collection(db, "tenants", tenantId, "products"), where("available", "==", true))),
  ]);
  return {
    categories: categorySnapshots.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as CatalogCategory),
    products: productSnapshots.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as CatalogProduct),
  };
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

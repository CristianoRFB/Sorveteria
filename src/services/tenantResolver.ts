import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/domain/tenant";
import { tenantSlugSchema } from "@/schemas/tenant";

export async function resolveTenantBySlug(rawSlug: string): Promise<Tenant | null> {
  const slug = tenantSlugSchema.parse(rawSlug);

  // A query inclui status para que a leitura pública corresponda às Security Rules.
  const q = query(
    collection(db, "tenants"),
    where("slug", "==", slug),
    where("status", "==", "active"),
    limit(1),
  );

  const result = await getDocs(q);
  if (result.empty) return null;

  const snap = result.docs[0];
  return { id: snap.id, ...snap.data() } as Tenant;
}

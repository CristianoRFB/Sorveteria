import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { assertFirebaseConfigured, db } from "@/lib/firebase";
import type { Tenant } from "@/domain/tenant";
import { tenantSlugSchema } from "@/schemas/tenant";

export function createTenantResolver(findActiveTenant: (slug: string) => Promise<Tenant | null>) {
  return async function resolveTenantBySlug(rawSlug: string): Promise<Tenant | null> {
    const slug = tenantSlugSchema.parse(rawSlug);
    const tenant = await findActiveTenant(slug);
    if (!tenant || tenant.slug !== slug || tenant.status !== "active") return null;
    return tenant;
  };
}

const findActiveTenant = async (slug: string): Promise<Tenant | null> => {
  assertFirebaseConfigured();
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
  const data = snap.data();
  tenantSlugSchema.parse(data.slug);
  if (data.status !== "active" || typeof data.branding?.displayName !== "string") {
    throw new Error("Dados públicos da sorveteria inválidos.");
  }
  return { id: snap.id, ...data } as Tenant;
};

export const resolveTenantBySlug = createTenantResolver(findActiveTenant);

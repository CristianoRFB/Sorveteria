import { httpsCallable } from "firebase/functions";
import { assertFirebaseConfigured,functions } from "@/lib/firebase";
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
const findActiveTenant=async (slug:string):Promise<Tenant|null>=>{
  assertFirebaseConfigured();
  // The public profile is a server-projected allowlist, not a raw tenant document.
  const call=httpsCallable<{slug:string},{tenant:Tenant|null}>(functions,"getPublicTenant",{timeout:20_000});
  return (await call({slug})).data.tenant;
};
export const resolveTenantBySlug=createTenantResolver(findActiveTenant);

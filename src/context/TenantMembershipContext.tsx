import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { watchMembership } from "@/services/membershipService";
import { TenantMembershipContext } from "@/context/tenantMembershipContextValue";

type MembershipResolution = { key: string; value: Membership | null; error: string | null };
import type { Membership } from "@/domain/membership";

export function TenantMembershipProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const { user, isPlatformOwner } = useAuth();
  const tenantId = tenant?.id;
  const uid = user?.uid;
  const key = tenantId && uid ? `${tenantId}:${uid}` : "";
  const [resolution, setResolution] = useState<MembershipResolution | null>(null);

  useEffect(() => {
    if (!key || !tenantId || !uid || isPlatformOwner) return;
    return watchMembership(
      tenantId,
      uid,
      (membership) => setResolution({ key, value: membership, error: null }),
      (error) => setResolution({ key, value: null, error: error.message }),
    );
  }, [key, tenantId, uid, isPlatformOwner]);

  const value = useMemo(() => ({
    membership: !isPlatformOwner && key && resolution?.key === key ? resolution.value : null,
    loading: Boolean(key && !isPlatformOwner && resolution?.key !== key),
    error: key && resolution?.key === key ? resolution.error : null,
  }), [isPlatformOwner, key, resolution]);
  return <TenantMembershipContext.Provider value={value}>{children}</TenantMembershipContext.Provider>;
}

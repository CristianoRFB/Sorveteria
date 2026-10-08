import { createContext } from "react";
import type { Membership } from "@/domain/membership";

export type TenantMembershipValue = { membership: Membership | null; loading: boolean; error: string | null };

export const TenantMembershipContext = createContext<TenantMembershipValue | null>(null);

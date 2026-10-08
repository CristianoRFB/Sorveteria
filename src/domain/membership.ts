import type { Role } from "./roles";

export type MembershipStatus = "active" | "inactive" | "invited";
export type Membership = {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
  email?: string;
  displayName?: string;
  createdAt?: unknown;
};

export function membershipDocumentId(tenantId: string, userId: string): string {
  return `${tenantId}_${userId}`;
}

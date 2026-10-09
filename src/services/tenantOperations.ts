import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Order } from "@/domain/order";
import type { Membership } from "@/domain/membership";
import type { TenantPlanId, TenantSubscriptionStatus } from "@/domain/tenant";
import { db, functions } from "@/lib/firebase";

export type TenantSummary = {
  id: string;
  slug: string;
  status: string;
  branding: { displayName: string };
  planId?: TenantPlanId | null;
  subscriptionStatus?: TenantSubscriptionStatus | null;
  trialUntil?: { toDate?: () => Date } | Date | null;
};

export type DriverDelivery = {
  id: string;
  tenantId: string;
  orderId: string;
  driverId: string;
  status: string;
  failedAttempts: number;
  confirmationFailures?: number;
  address?: { street: string; number: string; neighborhood: string; reference?: string };
  customer?: { name: string; phone: string };
  publicCode?: string;
};

export function watchTenantDeliveries(tenantId: string, onRows: (deliveries: DriverDelivery[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tenants", tenantId, "deliveries"), orderBy("updatedAt", "desc"), limit(100)),
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DriverDelivery)),
    (error) => onError(error),
  );
}

export function watchOrders(tenantId: string, onRows: (orders: Order[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tenants", tenantId, "orders"), orderBy("createdAt", "desc"), limit(100)),
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Order)),
    (error) => onError(error),
  );
}

export function watchDrivers(tenantId: string, onRows: (drivers: Membership[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "memberships"), where("tenantId", "==", tenantId), where("role", "==", "driver"), where("status", "==", "active")),
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Membership)),
    (error) => onError(error),
  );
}

export function watchDriverDeliveries(tenantId: string, driverId: string, onRows: (deliveries: DriverDelivery[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tenants", tenantId, "deliveries"), where("driverId", "==", driverId), orderBy("updatedAt", "desc"), limit(50)),
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DriverDelivery)),
    (error) => onError(error),
  );
}

export async function loadOrderForDriver(tenantId: string, orderId: string): Promise<Pick<DriverDelivery, "address" | "customer" | "publicCode"> | null> {
  const snapshot = await getDoc(doc(db, "tenants", tenantId, "orders", orderId));
  if (!snapshot.exists()) return null;
  const order = snapshot.data();
  return { address: order.address, customer: order.customer, publicCode: order.publicCode };
}

export async function platformCreateTenant(input: { displayName: string; slug: string; ownerEmail?: string }) {
  const call = httpsCallable(functions, "createTenant");
  return (await call(input)).data as { tenantId: string; slug: string; status: string; ownerFound: boolean };
}

export async function platformSetTenantStatus(input: { tenantId: string; status: "active" | "suspended"; reason: string }) {
  const call = httpsCallable(functions, "setTenantStatus");
  await call(input);
}

export async function platformAssignTenantPlan(input: {
  tenantId: string;
  planId: TenantPlanId;
  subscriptionStatus: TenantSubscriptionStatus;
  reason: string;
}) {
  const call = httpsCallable(functions, "assignTenantPlan");
  await call(input);
}

export async function platformEnterTenant(tenantId: string): Promise<void> {
  const call = httpsCallable(functions, "enterTenantContext");
  await call({ tenantId });
}

export async function addTenantMember(input: { tenantId: string; email: string; role: string }): Promise<void> {
  const call = httpsCallable(functions, "addTenantMember");
  await call(input);
}

export async function setTenantMemberStatus(input: { tenantId: string; userId: string; status: "active" | "inactive"; reason: string }): Promise<void> {
  const call = httpsCallable(functions, "setTenantMemberStatus");
  await call(input);
}

export function watchTenantMembers(tenantId: string, onRows: (members: Membership[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "memberships"), where("tenantId", "==", tenantId), limit(200)),
    (snapshot) => onRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Membership)
      .sort((a, b) => (a.displayName || a.email || a.userId).localeCompare(b.displayName || b.email || b.userId, "pt-BR"))),
    (error) => onError(error),
  );
}

import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

export type TenantPaymentMethod = { id: string; label: string; instructions?: string; enabled: boolean };
export type TenantSettings = { deliveryFeeCents: number; estimatedMinutes: number; paymentMethods: TenantPaymentMethod[] };

export async function loadTenantSettings(tenantId: string): Promise<TenantSettings> {
  const snapshot = await getDoc(doc(db, "tenants", tenantId, "settings", "main"));
  if (!snapshot.exists()) throw new Error("A sorveteria ainda não configurou o checkout.");
  const value = snapshot.data();
  return {
    deliveryFeeCents: Number(value.deliveryFeeCents) || 0,
    estimatedMinutes: Number(value.estimatedMinutes) || 30,
    paymentMethods: Array.isArray(value.paymentMethods) ? value.paymentMethods as TenantPaymentMethod[] : [],
  };
}

export async function saveTenantSettings(tenantId: string, settings: TenantSettings): Promise<void> {
  const call = httpsCallable(functions, "updateTenantSettings");
  await call({ tenantId, settings });
}

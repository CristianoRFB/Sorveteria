import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import type { CartItem } from "@/domain/cart";
import type { PublicTracking } from "@/domain/tracking";
import { db, functions } from "@/lib/firebase";

export type CheckoutInput = {
  tenantId: string;
  fulfillmentMode: "delivery" | "pickup";
  customer: { name: string; phone: string };
  address?: { street: string; number: string; neighborhood: string; reference?: string };
  paymentMethodId: string;
  items: CartItem[];
};
type CreateOrderPayload = Omit<CheckoutInput, "items"> & {
  items: Array<{ productId: string; quantity: number; selections: CartItem["selections"] }>;
};

export type CreatedOrder = { orderId: string; publicCode: string; deliveryCode: string | null };

export async function createOrder(input: CheckoutInput): Promise<CreatedOrder> {
  const call = httpsCallable<CreateOrderPayload, CreatedOrder>(functions, "createOrder");
  const result = await call({
    ...input,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selections: item.selections,
    })),
  });
  return result.data;
}

export async function findPublicTracking(tenantId: string, publicCode: string): Promise<PublicTracking | null> {
  const normalized = publicCode.trim().toUpperCase();
  if (!/^SV-[A-HJ-NP-Z2-9]{8}$/.test(normalized)) return null;
  const snapshot = await getDoc(doc(db, "tenants", tenantId, "publicOrderTracking", normalized));
  return snapshot.exists() ? snapshot.data() as PublicTracking : null;
}

export async function changeOrderStatus(tenantId: string, orderId: string, status: string, reason?: string): Promise<void> {
  const call = httpsCallable(functions, "updateOrderStatus");
  await call({ tenantId, orderId, status, reason });
}

export async function assignDelivery(tenantId: string, orderId: string, driverId: string): Promise<void> {
  const call = httpsCallable(functions, "assignDelivery");
  await call({ tenantId, orderId, driverId });
}

export async function driverDeliveryAction(
  tenantId: string,
  deliveryId: string,
  action: "start" | "arrive" | "deliver" | "failed",
  deliveryCode?: string,
): Promise<void> {
  const call = httpsCallable(functions, "driverDeliveryAction");
  await call({ tenantId, deliveryId, action, deliveryCode });
}

export async function resetDeliveryConfirmationCode(tenantId: string, orderId: string, reason: string): Promise<string> {
  const call = httpsCallable<{ tenantId: string; orderId: string; reason: string }, { deliveryCode: string }>(functions, "resetDeliveryConfirmationCode");
  const result = await call({ tenantId, orderId, reason });
  return result.data.deliveryCode;
}

import { httpsCallable } from "firebase/functions";
import type { CartItem } from "@/domain/cart";
import type { PublicTracking } from "@/domain/tracking";
import { withTrackingLookupTimeout } from "@/domain/trackingTimeout";
import { functions } from "@/lib/firebase";

export type CheckoutInput = {
  tenantId: string;
  fulfillmentMode: "delivery" | "pickup";
  customer: { name: string; phone: string };
  address?: { street: string; number: string; neighborhood: string; reference?: string };
  paymentMethodId: string;
  requestId?: string;
  items: CartItem[];
};
type CreateOrderPayload = Omit<CheckoutInput, "items"> & {
  items: Array<{ productId: string; quantity: number; selections: CartItem["selections"] }>;
};

export type CreatedOrder = { orderId: string; publicCode: string; deliveryCode: string | null; replayed?: boolean };

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
  // Fetch the public projection via HTTPS callable rather than the browser's
  // Firestore streaming channel, which intermittently hung in emulator E2E.
  const lookup = httpsCallable<{tenantId: string; publicCode: string}, {tracking: PublicTracking | null}>(
    functions, "getPublicOrderTracking", {timeout: 20_000},
  );
  const result = await withTrackingLookupTimeout(lookup({tenantId, publicCode: normalized}), 30_000);
  return result.data.tracking;
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

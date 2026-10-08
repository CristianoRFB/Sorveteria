import type { FulfillmentMode, OrderStatus } from "./order";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  received: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["awaiting_driver", "ready_for_pickup", "cancelled"],
  awaiting_driver: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  delivered: [],
  picked_up: [],
  cancelled: [],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus, fulfillment: FulfillmentMode): boolean {
  if (!allowedTransitions[current].includes(next)) return false;
  if (next === "awaiting_driver" || next === "out_for_delivery" || next === "delivered") {
    return fulfillment === "delivery";
  }
  if (next === "ready_for_pickup" || next === "picked_up") return fulfillment === "pickup";
  return true;
}

export function publicOrderCodeFromBytes(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `SV-${Array.from(bytes.slice(0, 6), (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export type DeliveryStatus =
  | "queued"
  | "assigned"
  | "out_for_delivery"
  | "arrived"
  | "delivered"
  | "failed"
  | "cancelled";

export type Delivery = {
  id: string;
  tenantId: string;
  orderId: string;
  driverId?: string;
  status: DeliveryStatus;
  // Nunca confundir com o código público de acompanhamento do pedido.
  deliveryCodeHash?: string;
  failedAttempts: number;
};

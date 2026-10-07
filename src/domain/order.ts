export type FulfillmentMode = "delivery" | "pickup" | "table";

export type OrderStatus =
  | "received"
  | "confirmed"
  | "preparing"
  | "ready"
  | "awaiting_driver"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "picked_up"
  | "cancelled";

export type OrderSource = {
  channel: "web" | "qr";
  qrCodeId?: string;
  tableId?: string;
};

export type OrderMoney = {
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
};

export type Order = {
  id: string;
  tenantId: string;
  publicCode: string;
  customerId?: string;
  fulfillmentMode: FulfillmentMode;
  status: OrderStatus;
  source: OrderSource;
  money: OrderMoney;
  estimatedMinutes?: number;
};

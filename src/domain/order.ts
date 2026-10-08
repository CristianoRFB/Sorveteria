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
  createdAt?: unknown;
  updatedAt?: unknown;
  customerId?: string;
  customer: { name: string; phone: string };
  fulfillmentMode: FulfillmentMode;
  status: OrderStatus;
  source: OrderSource;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    selections: Record<string, string[]>;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  address?: { street: string; number: string; neighborhood: string; reference?: string };
  paymentMethodId: string;
  money: OrderMoney;
  estimatedMinutes?: number;
};

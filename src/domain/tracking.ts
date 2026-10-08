export type PublicTracking = {
  publicCode: string;
  status: string;
  timeline: Array<{ status: string; at: string }>;
  fulfillmentMode: "delivery" | "pickup";
  estimatedMinutes?: number;
};

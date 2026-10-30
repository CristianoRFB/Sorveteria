import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { projectDriverAssignment } = require("../functions/domain/driver-assignment-projection.cjs");
const delivery = {
  tenantId: "tenant-alpha", driverId: "driver-alpha", orderId: "order-1",
  status: "assigned", failedAttempts: 2, confirmationFailures: 1,
  confirmationCode: "NEVER_EXPOSE", internalNotes: "NEVER_EXPOSE",
};
const order = {
  tenantId: "tenant-alpha", fulfillmentMode: "delivery", publicCode: "SV-ABCDEFGH",
  customer: { name: "Ana", phone: "11999999999", privateToken: "NEVER_EXPOSE" },
  address: { street: "Rua 1", number: "12", neighborhood: "Centro", reference: "Portao", gpsPrivate: "NEVER_EXPOSE" },
  money: { totalCents: 5000 }, deliveryCodeHash: "NEVER_EXPOSE",
};
const project = (d: unknown = delivery, o: unknown = order) =>
  projectDriverAssignment("delivery-1", "tenant-alpha", "driver-alpha", d, o);
describe("driver assignment projection privacy", () => {
  it("returns only explicitly allowed operational fields, including nested PII", () => {
    const result = project();
    expect(result).toEqual({
      id: "delivery-1", tenantId: "tenant-alpha", driverId: "driver-alpha",
      orderId: "order-1", status: "assigned", failedAttempts: 2, confirmationFailures: 1,
      publicCode: "SV-ABCDEFGH",
      customer: { name: "Ana", phone: "11999999999" },
      address: { street: "Rua 1", number: "12", neighborhood: "Centro", reference: "Portao" },
    });
    expect(JSON.stringify(result)).not.toMatch(/NEVER_EXPOSE|money|deliveryCodeHash/);
  });
  it("fails closed on cross-tenant records and another driver's assignments", () => {
    expect(project({ ...delivery, tenantId: "tenant-beta" })).toBeNull();
    expect(project({ ...delivery, driverId: "driver-beta" })).toBeNull();
    expect(project(delivery, { ...order, tenantId: "tenant-beta" })).toBeNull();
    expect(project(delivery, { ...order, fulfillmentMode: "pickup" })).toBeNull();
  });
  it("rejects malformed IDs and delivery statuses", () => {
    expect(project({ ...delivery, orderId: "../secret" })).toBeNull();
    expect(project({ ...delivery, status: "<script>" })).toBeNull();
  });
  it("does not leak non-string nested values or excessive counts", () => {
    const result = project(
      { ...delivery, failedAttempts: -2, confirmationFailures: Number.POSITIVE_INFINITY },
      { ...order, publicCode: "invalid",
        customer: { name: { secret: "NEVER_EXPOSE" }, phone: ["NEVER_EXPOSE"] },
        address: { street: { secret: "NEVER_EXPOSE" }, number: 99, neighborhood: null, reference: ["NEVER_EXPOSE"] },
      },
    );
    expect(result.customer).toEqual({ name: "", phone: "" });
    expect(result.address).toEqual({ street: "", number: "", neighborhood: "", reference: "" });
    expect(result.failedAttempts).toBe(0);
    expect(result.confirmationFailures).toBe(0);
    expect(result).not.toHaveProperty("publicCode");
    expect(JSON.stringify(result)).not.toContain("NEVER_EXPOSE");
  });
  it("preserves assignment status if an order was deleted without exposing stale customer data", () => {
    const result = project(delivery, null);
    expect(result).toMatchObject({ id: "delivery-1", status: "assigned", orderId: "order-1" });
    expect(result).not.toHaveProperty("address");
    expect(result).not.toHaveProperty("customer");
  });
});

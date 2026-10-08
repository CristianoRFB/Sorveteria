import { describe, expect, it } from "vitest";
import { canTransitionDelivery, codeFromBytes, deliveryCodeHash, isDeliveryCodeValid } from "../functions/domain/delivery.cjs";

describe("código e transições de delivery", () => {
  it("gera e valida código curto sem caracteres ambíguos", () => {
    const code = codeFromBytes(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(isDeliveryCodeValid(code)).toBe(true);
    expect(isDeliveryCodeValid("ABCDEFG1")).toBe(false);
    expect(isDeliveryCodeValid("ABCDEFGH-extra")).toBe(false);
  });

  it("vincula o hash do código ao tenant e ao pedido", () => {
    const hash = deliveryCodeHash("ABCDEFGH", "tenant-alpha", "order-1");
    expect(deliveryCodeHash("ABCDEFGH", "tenant-alpha", "order-1")).toBe(hash);
    expect(deliveryCodeHash("ABCDEFGH", "tenant-beta", "order-1")).not.toBe(hash);
    expect(deliveryCodeHash("ABCDEFGH", "tenant-alpha", "order-2")).not.toBe(hash);
    expect(deliveryCodeHash("ABCDEFGJ", "tenant-alpha", "order-1")).not.toBe(hash);
  });

  it("aceita somente transições autorizadas do motorista", () => {
    expect(canTransitionDelivery("assigned", "start")).toBe(true);
    expect(canTransitionDelivery("out_for_delivery", "arrive")).toBe(true);
    expect(canTransitionDelivery("out_for_delivery", "failed")).toBe(true);
    expect(canTransitionDelivery("arrived", "deliver")).toBe(true);
    expect(canTransitionDelivery("arrived", "failed")).toBe(true);
    expect(canTransitionDelivery("assigned", "deliver")).toBe(false);
    expect(canTransitionDelivery("out_for_delivery", "deliver")).toBe(false);
    expect(canTransitionDelivery("delivered", "start")).toBe(false);
    expect(canTransitionDelivery("cancelled", "arrive")).toBe(false);
  });
});

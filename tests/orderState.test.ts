import { describe, expect, it } from "vitest";
import { canTransitionOrder, publicOrderCodeFromBytes } from "@/domain/orderState";
import type { OrderStatus } from "@/domain/order";

describe("state machine de pedidos", () => {
  it("permite somente a sequência operacional válida", () => {
    expect(canTransitionOrder("received", "confirmed", "pickup")).toBe(true);
    expect(canTransitionOrder("confirmed", "preparing", "pickup")).toBe(true);
    expect(canTransitionOrder("preparing", "ready", "pickup")).toBe(true);
    expect(canTransitionOrder("ready", "ready_for_pickup", "pickup")).toBe(true);
    expect(canTransitionOrder("ready_for_pickup", "picked_up", "pickup")).toBe(true);
  });

  it("rejeita saltos, repetição de estado e rotas incompatíveis", () => {
    expect(canTransitionOrder("received", "delivered", "delivery")).toBe(false);
    expect(canTransitionOrder("ready", "awaiting_driver", "pickup")).toBe(false);
    expect(canTransitionOrder("ready", "ready_for_pickup", "delivery")).toBe(false);
    expect(canTransitionOrder("delivered", "cancelled", "delivery")).toBe(false);
  });

  it("gera código público humano e não usa caracteres ambíguos", () => {
    const code = publicOrderCodeFromBytes(new Uint8Array([1, 2, 3, 4, 5, 6]));
    expect(code).toMatch(/^SV-[A-HJ-NP-Z2-9]{6}$/);
    expect(code).not.toMatch(/[01IO]/);
  });

  it("tipa estados finais sem permitir transições a partir deles", () => {
    const terminal: OrderStatus[] = ["delivered", "picked_up", "cancelled"];
    expect(terminal.every((status) => !canTransitionOrder(status, "confirmed", "pickup"))).toBe(true);
  });
});

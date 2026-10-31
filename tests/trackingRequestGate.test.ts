import { describe, expect, it } from "vitest";
import { createTrackingRequestGate } from "../src/domain/trackingRequestGate";

describe("tracking: stale query isolation", () => {
  it("ignores responses from the previous tenant after a context change", () => {
    const gate = createTrackingRequestGate();
    const requestForAlpha = gate.begin();
    gate.invalidate();
    const requestForBeta = gate.begin();
    expect(gate.isCurrent(requestForAlpha)).toBe(false);
    expect(gate.isCurrent(requestForBeta)).toBe(true);
  });

  it("ignores the older lookup when a user searches another public code", () => {
    const gate = createTrackingRequestGate();
    const first = gate.begin();
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it("ignores in-flight lookups after unmount", () => {
    const gate = createTrackingRequestGate();
    const request = gate.begin();
    gate.invalidate();
    expect(gate.isCurrent(request)).toBe(false);
  });
});

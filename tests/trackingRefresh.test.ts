import { describe, expect, it } from "vitest";
import { isTerminalTrackingStatus, TRACKING_REFRESH_INTERVAL_MS, trackingRefreshDelayMs } from "../src/domain/trackingRefresh";
describe("tracking polling policy", () => {
  it.each(["delivered", "picked_up", "cancelled"])("stops on terminal status %s", (status) => {
    expect(isTerminalTrackingStatus(status)).toBe(true);
  });
  it.each(["received", "confirmed", "preparing", "ready", "awaiting_driver", "out_for_delivery", "arrived", "ready_for_pickup"])("continues on %s", (status) => {
    expect(isTerminalTrackingStatus(status)).toBe(false);
  });
  it("caps refreshes at 30/60/120s", () => {
    expect(TRACKING_REFRESH_INTERVAL_MS).toBe(30_000);
    expect([0, 1, 2, 10].map(trackingRefreshDelayMs)).toEqual([30_000, 60_000, 120_000, 120_000]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackingLookupTimeoutError, withTrackingLookupTimeout } from "../src/domain/trackingTimeout";
afterEach(() => vi.useRealTimers());
describe("tracking: bounded public lookup", () => {
  it("resolves timely requests", async () => {
    await expect(withTrackingLookupTimeout(Promise.resolve("ok"), 500)).resolves.toBe("ok");
  });
  it("rejects stalled Firestore reads", async () => {
    vi.useFakeTimers();
    const stalled = withTrackingLookupTimeout(new Promise<never>(() => {}), 1000);
    const assertion = expect(stalled).rejects.toBeInstanceOf(TrackingLookupTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
  it("preserves real Firestore errors", async () => {
    const err = new Error("permission-denied");
    await expect(withTrackingLookupTimeout(Promise.reject(err), 500)).rejects.toBe(err);
  });
  it("fails closed for invalid timeouts", async () => {
    await expect(withTrackingLookupTimeout(Promise.resolve(true), NaN)).rejects.toBeInstanceOf(RangeError);
  });
});

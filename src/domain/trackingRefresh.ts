/** Public tracking refresh policy: bounded, quota-aware and terminal-safe. */
export const TRACKING_REFRESH_INTERVAL_MS = 30_000;
const terminalStatuses = new Set(["delivered", "picked_up", "cancelled"]);
export function isTerminalTrackingStatus(status: string): boolean {
  return terminalStatuses.has(status);
}
export function trackingRefreshDelayMs(failures: number): number {
  const n = Number.isFinite(failures) ? Math.min(2, Math.max(0, Math.trunc(failures))) : 2;
  return Math.min(120_000, TRACKING_REFRESH_INTERVAL_MS * (2 ** n));
}

/** Latest-request-wins guard: prevents stale Firestore reads from overwriting tenant context. */
export function createTrackingRequestGate() {
  let version = 0;
  return {
    begin: () => ++version,
    isCurrent: (token: number) => token === version,
    invalidate: () => { version += 1; },
  };
}

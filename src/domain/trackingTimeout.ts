/** Ensure public tracking reads never remain pending indefinitely. */
export class TrackingLookupTimeoutError extends Error {
  constructor() {
    super("A consulta do pedido demorou mais que o esperado. Tente novamente.");
    this.name = "TrackingLookupTimeoutError";
  }
}
export function withTrackingLookupTimeout<T>(request: Promise<T>, timeoutMs = 30_000): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Promise.reject(new RangeError("O limite de tempo da consulta deve ser positivo e finito."));
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TrackingLookupTimeoutError()), timeoutMs);
  });
  return Promise.race([request, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

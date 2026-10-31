// Keep the same cryptographic request ID across timeout, retries and page refresh.
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function session(): Storage | null { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } }
export const checkoutAttemptStorageKey = (tenantId: string) => `sorveteria.checkout.${tenantId}.attempt.v1`;
export function checkoutAttemptId(
  tenantId: string,
  remembered: string | null,
  storage: Pick<Storage, "getItem" | "setItem"> | null = session(),
  generate: () => string = () => crypto.randomUUID(),
): string {
  if (remembered && requestIdPattern.test(remembered)) return remembered;
  const key = checkoutAttemptStorageKey(tenantId);
  let stored: string | null = null;
  try { stored = storage?.getItem(key) ?? null; } catch { /* storage unavailable */ }
  if (stored && requestIdPattern.test(stored)) return stored;
  const created = generate();
  if (!requestIdPattern.test(created)) throw new Error("Não foi possível iniciar uma tentativa segura do pedido.");
  try { storage?.setItem(key, created); } catch { /* in-memory retry works until unmount */ }
  return created;
}
export function clearCheckoutAttemptId(tenantId: string, storage: Pick<Storage, "removeItem"> | null = session()) {
  try { storage?.removeItem(checkoutAttemptStorageKey(tenantId)); } catch { /* best effort */ }
}

import { commercialStatusMessage } from "@/domain/entitlements";
import { useTenant } from "@/hooks/useTenant";

export function CommercialStatusNotice() {
  const { tenant } = useTenant();
  const message = commercialStatusMessage(tenant);
  if (!message) return null;
  return <p className="notice commercial-status-notice" role="status">{message}</p>;
}

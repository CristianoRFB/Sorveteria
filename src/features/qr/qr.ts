import QRCode from "qrcode";

export type TenantQrTarget =
  | { kind: "menu"; tenantSlug: string }
  | { kind: "table"; tenantSlug: string; tableId: string };

export function buildTenantQrUrl(baseUrl: string, target: TenantQrTarget): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (target.kind === "menu") return `${base}/${target.tenantSlug}/cardapio`;
  return `${base}/${target.tenantSlug}/cardapio?table=${encodeURIComponent(target.tableId)}`;
}

export async function generateTenantQrDataUrl(
  baseUrl: string,
  target: TenantQrTarget,
): Promise<string> {
  const url = buildTenantQrUrl(baseUrl, target);
  // Geração local: nenhum serviço externo de QR Code.
  return QRCode.toDataURL(url, {
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M",
  });
}

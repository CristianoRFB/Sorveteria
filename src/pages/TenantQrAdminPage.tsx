import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { generateTenantQrDataUrl } from "@/features/qr/qr";

export function TenantQrAdminPage() {
  const { tenant } = useTenant();
  const [qr, setQr] = useState<string | null>(null);

  async function generate() {
    if (!tenant) return;
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    setQr(await generateTenantQrDataUrl(baseUrl, { kind: "menu", tenantSlug: tenant.slug }));
  }

  return (
    <main className="content">
      <h1>QR Code do cardápio</h1>
      <p>Gerado localmente, sem depender de serviço externo.</p>
      <button type="button" className="button primary" onClick={generate}>Gerar QR Code</button>
      {qr && <img className="qr-preview" src={qr} alt="QR Code do cardápio" />}
    </main>
  );
}

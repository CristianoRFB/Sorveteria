import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TenantProvider } from "@/context/TenantContext";
import { SaasLandingPage } from "@/pages/SaasLandingPage";
import { PlatformAdminPage } from "@/pages/PlatformAdminPage";
import { TenantStorefrontPage } from "@/pages/TenantStorefrontPage";
import { TenantMenuPage } from "@/pages/TenantMenuPage";
import { TenantTrackingPage } from "@/pages/TenantTrackingPage";
import { TenantAdminPage } from "@/pages/TenantAdminPage";
import { TenantQrAdminPage } from "@/pages/TenantQrAdminPage";

function TenantRoutes() {
  return (
    <TenantProvider>
      <Routes>
        <Route index element={<TenantStorefrontPage />} />
        <Route path="cardapio" element={<TenantMenuPage />} />
        <Route path="acompanhar" element={<TenantTrackingPage />} />
        <Route path="painel" element={<TenantAdminPage />} />
        <Route path="painel/qr-codes" element={<TenantQrAdminPage />} />
      </Routes>
    </TenantProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SaasLandingPage />} />
        <Route path="/admin" element={<PlatformAdminPage />} />
        <Route path="/:tenantSlug/*" element={<TenantRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

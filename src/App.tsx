import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { TenantProvider } from "@/context/TenantContext";
import { TenantMembershipProvider } from "@/context/TenantMembershipContext";
import { PlatformOwnerGuard, TenantMemberGuard } from "@/components/AccessGuards";
import { useTenant } from "@/hooks/useTenant";

const SaasLandingPage = lazy(() => import("@/pages/SaasLandingPage").then((module) => ({ default: module.SaasLandingPage })));
const PlatformAdminPage = lazy(() => import("@/pages/PlatformAdminPage").then((module) => ({ default: module.PlatformAdminPage })));
const TenantStorefrontPage = lazy(() => import("@/pages/TenantStorefrontPage").then((module) => ({ default: module.TenantStorefrontPage })));
const TenantMenuPage = lazy(() => import("@/pages/TenantMenuPage").then((module) => ({ default: module.TenantMenuPage })));
const TenantTrackingPage = lazy(() => import("@/pages/TenantTrackingPage").then((module) => ({ default: module.TenantTrackingPage })));
const TenantAdminPage = lazy(() => import("@/pages/TenantAdminPage").then((module) => ({ default: module.TenantAdminPage })));
const TenantQrAdminPage = lazy(() => import("@/pages/TenantQrAdminPage").then((module) => ({ default: module.TenantQrAdminPage })));
const CartPage = lazy(() => import("@/pages/CartPage").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const DriverPage = lazy(() => import("@/pages/DriverPage").then((module) => ({ default: module.DriverPage })));

function TenantScopedRoutes() {
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  return <div key={tenant?.id ?? tenantSlug ?? "tenant-unresolved"}><TenantMembershipProvider><CartProvider key={tenant?.id ?? "tenant-unresolved"}>
    <Routes>
      <Route index element={<TenantStorefrontPage />} />
      <Route path="cardapio" element={<TenantMenuPage />} />
      <Route path="carrinho" element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="acompanhar" element={<TenantTrackingPage />} />
      <Route path="painel" element={<TenantAdminRoute><TenantAdminPage /></TenantAdminRoute>} />
      <Route path="painel/qr-codes" element={<TenantAdminRoute><TenantQrAdminPage /></TenantAdminRoute>} />
      <Route path="painel/entregas" element={<TenantAdminRoute driverOnly><DriverPage /></TenantAdminRoute>} />
    </Routes>
  </CartProvider></TenantMembershipProvider></div>;
}

function TenantAdminRoute({ children, driverOnly = false }: { children: React.ReactNode; driverOnly?: boolean }) {
  const { tenant } = useTenant();
  return <TenantMemberGuard key={tenant?.id ?? "tenant-unresolved"} driverOnly={driverOnly}>{children}</TenantMemberGuard>;
}

function TenantRoutes() {
  return (
    <TenantProvider>
      <TenantScopedRoutes />
    </TenantProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<main className="page-shell"><p>Carregando…</p></main>}>
          <Routes>
            <Route path="/" element={<SaasLandingPage />} />
            <Route path="/admin" element={<PlatformOwnerGuard><PlatformAdminPage /></PlatformOwnerGuard>} />
            <Route path="/:tenantSlug/*" element={<TenantRoutes />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

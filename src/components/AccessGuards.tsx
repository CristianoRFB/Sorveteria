import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useTenantMembership } from "@/hooks/useTenantMembership";
import { canAccessTenantAdmin } from "@/services/tenantAccess";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { LoginForm } from "@/components/AuthForms";

export function PlatformOwnerGuard({ children }: { children: ReactNode }) {
  const { user, loading, isPlatformOwner, signOut } = useAuth();
  if (loading) return <LoadingState label="Verificando acesso..." />;
  if (!user) return <LoginForm title="Platform Owner" description="Entre com uma conta autorizada da plataforma." />;
  if (!isPlatformOwner) return <ErrorState message="Acesso restrito ao Platform Owner." />;
  return <GuardFrame onSignOut={signOut}>{children}</GuardFrame>;
}

export function TenantMemberGuard({ children, driverOnly = false }: { children: ReactNode; driverOnly?: boolean }) {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const { user, loading: authLoading, isPlatformOwner, signOut } = useAuth();
  const { membership, loading: membershipLoading, error: membershipError } = useTenantMembership();

  if (tenantLoading || authLoading) return <LoadingState label="Verificando sorveteria e acesso..." />;
  if (tenantError || !tenant) return <ErrorState message={tenantError ?? "Sorveteria indisponível."} />;
  if (!user) return <LoginForm title={`Entrar em ${tenant.branding.displayName}`} description="Entre com uma conta vinculada a esta sorveteria." />;
  if (isPlatformOwner) return <GuardFrame onSignOut={signOut} showPlatformReturn>{children}</GuardFrame>;
  if (membershipLoading) return <LoadingState label="Verificando vínculo com a sorveteria..." />;
  if (membershipError) return <ErrorState message="Não foi possível confirmar seu acesso. Tente novamente." />;
  if (!membership || membership.status !== "active") return <ErrorState message="Seu acesso a esta sorveteria não está ativo." />;
  if (driverOnly ? membership.role !== "driver" : !canAccessTenantAdmin(membership.role)) {
    return <ErrorState message="Seu perfil não tem acesso a esta área." />;
  }
  return <GuardFrame onSignOut={signOut}>{children}</GuardFrame>;
}

function GuardFrame({ children, onSignOut, showPlatformReturn = false }: { children: ReactNode; onSignOut: () => Promise<void>; showPlatformReturn?: boolean }) {
  const navigate = useNavigate();
  return <>
    <div className="session-bar"><span>Sessão autenticada</span>{showPlatformReturn && <button className="text-button" onClick={() => navigate("/admin")}>Voltar à plataforma</button>}<button className="text-button" onClick={() => void onSignOut()}>Sair</button></div>
    {children}
  </>;
}

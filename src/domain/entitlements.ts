import planCatalog from "../../functions/domain/plan-catalog.json";
import featureAvailability from "../../functions/domain/feature-availability.json";
import type { Tenant } from "@/domain/tenant";
import { usingFirebaseEmulators } from "@/lib/firebase";

const operationalFeatureFlags: Record<string, keyof Tenant["features"]> = {
  online_menu: "onlineMenu",
  pickup: "pickup",
  simple_delivery: "delivery",
  qr_menu: "qrCodes",
};

function timestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") return value.seconds * 1000;
  return Number.NaN;
}

export type FeatureAccess = { allowed: boolean; reason: string | null };

export function evaluateTenantFeature(tenant: Tenant | null, feature: string, nowMs = Date.now()): FeatureAccess {
  if (!tenant || tenant.status !== "active") return { allowed: false, reason: "tenant-inactive" };
  const plan = tenant.planId ? planCatalog.plans[tenant.planId] : null;
  if (!plan || !tenant.subscriptionStatus) return { allowed: false, reason: "plan-unassigned" };
  if (tenant.subscriptionStatus === "demo") {
    if (tenant.planId !== "premium" || !usingFirebaseEmulators) return { allowed: false, reason: "demo-unavailable" };
  } else if (tenant.subscriptionStatus === "trial") {
    if (tenant.planId !== planCatalog.trial.planId) return { allowed: false, reason: "invalid-trial" };
    const until = timestampMillis(tenant.trialUntil);
    if (!Number.isFinite(until)) return { allowed: false, reason: "invalid-trial" };
    if (nowMs >= until) return { allowed: false, reason: "trial-expired" };
  } else if (!["active", "past_due"].includes(tenant.subscriptionStatus)) {
    return { allowed: false, reason: tenant.subscriptionStatus === "cancelled" ? "subscription-cancelled" : "subscription-suspended" };
  }
  const availability = featureAvailability as Record<string, string>;
  if (!Object.hasOwn(availability, feature)) return { allowed: false, reason: "feature-unknown" };
  const override = tenant.entitlementOverrides?.[feature];
  if (typeof override === "boolean" ? !override : !plan.features.includes(feature)) return { allowed: false, reason: "plan-required" };
  if (availability[feature] !== "implemented") return { allowed: false, reason: "feature-not-implemented" };
  const operationalFlag = operationalFeatureFlags[feature];
  if (operationalFlag && tenant.features?.[operationalFlag] !== true) return { allowed: false, reason: "feature-disabled-for-tenant" };
  return { allowed: true, reason: null };
}

export function canUseTenantFeature(tenant: Tenant | null, feature: string, nowMs = Date.now()): boolean {
  return evaluateTenantFeature(tenant, feature, nowMs).allowed;
}

export function featureAccessMessage(tenant: Tenant | null, feature: string): string | null {
  const access = evaluateTenantFeature(tenant, feature);
  if (access.allowed) return null;
  const messages: Record<string, string> = {
    "tenant-inactive": "A sorveteria está indisponível para novas operações.",
    "plan-unassigned": "O Platform Owner ainda precisa atribuir um plano a esta sorveteria.",
    "trial-expired": "O período de avaliação terminou. Consulte os dados enquanto o plano é revisado.",
    "subscription-suspended": "A assinatura está suspensa. Os dados permanecem disponíveis para consulta.",
    "subscription-cancelled": "A assinatura foi cancelada. Os dados permanecem disponíveis para consulta.",
    "demo-unavailable": "A demonstração só está disponível no Emulator Suite local.",
    "plan-required": "Este recurso não está incluído no plano atual.",
    "feature-not-implemented": "Este recurso ainda não está disponível nesta versão.",
    "feature-disabled-for-tenant": "Este recurso está temporariamente desabilitado nesta sorveteria.",
  };
  return messages[access.reason || ""] || "Este recurso está indisponível.";
}

export function commercialStatusMessage(tenant: Tenant | null): string | null {
  if (!tenant) return null;
  if (tenant.subscriptionStatus === "demo") return "Ambiente de demonstração — dados fictícios. Nenhuma operação real será realizada.";
  const status = evaluateTenantFeature(tenant, "storefront");
  if (status.reason === "plan-unassigned") return "Plano ainda não atribuído. A leitura permanece disponível; novas operações comerciais aguardam a atribuição do plano.";
  if (status.reason === "trial-expired") return "O período de avaliação terminou. Os dados permanecem preservados e a operação está em modo de leitura.";
  if (status.reason === "subscription-cancelled") return "Assinatura cancelada. Os dados permanecem preservados para consulta.";
  if (status.reason === "subscription-suspended") return "Assinatura suspensa. Os dados permanecem preservados para consulta.";
  if (status.reason === "demo-unavailable" || status.reason === "invalid-trial") return "Estado comercial inválido. A operação está bloqueada até revisão do Platform Owner.";
  return null;
}

export const sorveteriaPlanCatalog = planCatalog;

import type { TenantFeatureFlags } from "./featureFlags";

export type TenantStatus = "active" | "suspended" | "onboarding" | "archived";
export type TenantSubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled" | "demo";
export type TenantPlanId = "essencial" | "pro" | "premium";

export type TenantBranding = {
  displayName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: "sm" | "md" | "lg";
};

export type Tenant = {
  id: string;
  slug: string;
  status: TenantStatus;
  branding: TenantBranding;
  features: TenantFeatureFlags;
  planId?: TenantPlanId;
  subscriptionStatus?: TenantSubscriptionStatus;
  trialUntil?: unknown;
  entitlementOverrides?: Record<string, boolean>;
  limitOverrides?: Record<string, number | null>;
  commercialRevision?: number;
  contact?: {
    whatsapp?: string;
    phone?: string;
    address?: string;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
};

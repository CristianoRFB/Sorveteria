import type { TenantFeatureFlags } from "./featureFlags";

export type TenantStatus = "active" | "suspended" | "onboarding" | "archived";

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
  contact?: {
    whatsapp?: string;
    phone?: string;
    address?: string;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TenantFeatureFlags = {
  onlineMenu: boolean;
  pickup: boolean;
  delivery: boolean;
  qrCodes: boolean;
  tableOrdering: boolean;
  kds: boolean;
  cashRegister: boolean;
  finance: boolean;
  coupons: boolean;
  inventory: boolean;
};

export const defaultSorveteriaFeatures: TenantFeatureFlags = {
  onlineMenu: true,
  pickup: true,
  delivery: true,
  qrCodes: true,
  tableOrdering: false,
  kds: false,
  cashRegister: false,
  finance: false,
  coupons: false,
  inventory: false,
};

export const roles = [
  "platform_owner",
  "tenant_owner",
  "tenant_admin",
  "staff",
  "cashier",
  "customer",
  "driver",
] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  platform_owner: "Platform Admin",
  tenant_owner: "Dono da sorveteria",
  tenant_admin: "Administrador",
  staff: "Equipe",
  cashier: "Caixa",
  customer: "Cliente",
  driver: "Entregador",
};

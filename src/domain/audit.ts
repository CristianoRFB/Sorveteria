export type AuditAction =
  | "tenant.created"
  | "tenant.updated"
  | "tenant.suspended"
  | "tenant.reactivated"
  | "tenant.context_entered"
  | "category.updated"
  | "product.updated"
  | "delivery.assigned"
  | "delivery.reassigned"
  | "delivery.failed"
  | "order.status_changed"
  | "delivery.override"
  | "cash.opened"
  | "cash.closed"
  | "role.changed";

export type AuditLog = {
  tenantId?: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  result: "success" | "failure";
  createdAt: unknown;
};

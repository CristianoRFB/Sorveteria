# ARCHITECTURE — estado atual + alvo comercial

## Runtime atual

```text
Cloudflare (destino planejado)
→ React/Vite
→ Tenant Resolver
→ TenantContext
→ Firebase Auth / Firestore / Storage
```

O repositório implementa somente a vertical **Sorveteria**.

## Multi-tenancy atual

- `tenantId` é a fronteira de dados;
- `memberships/{tenantId}_{uid}` é o desenho atual para autorização;
- `platform_owner` é claim global proposta/esperada;
- tenant pode ser `active`, `suspended`, `onboarding`, `archived`;
- shared deploy dentro da vertical.

## Feature flags atuais

`TenantFeatureFlags` controla configuração/capacidade no tenant.

Isso **não deve ser confundido com entitlement comercial**.

## Arquitetura alvo de planos — NEXT

```text
Plan Catalog
     ↓
Tenant Subscription
     ↓
Entitlement Resolver
     ↓
Effective Entitlements
     ├── UI gates
     ├── operation/service gates
     └── usage limits

Tenant Config / Feature Flags
     ↓
Enabled operational configuration
```

Regra efetiva:

```text
DIREITO COMERCIAL
AND
CONFIGURAÇÃO DO TENANT
= FEATURE UTILIZÁVEL
```

Exemplo:

```text
canUse(delivery) && tenantConfig.deliveryEnabled
```

## Overrides

```text
basePlan
+ entitlementOverrides
+ limitOverrides
= effective entitlements
```

Sem forks ou `if tenantId == cliente`.

## Billing

Billing automático é `DEFERRED`.

Primeiro os planos podem ser atribuídos manualmente pelo Platform Owner depois que a camada de entitlement existir.

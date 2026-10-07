# ENTITLEMENTS DELTA — o que falta tecnicamente

## Estado atual

Hoje o projeto possui `TenantFeatureFlags`, ou seja, flags booleanas diretamente no tenant.

Isso **não é um sistema de planos**.

Não existem no runtime atual:

- `planId`;
- catálogo de planos;
- `subscriptionStatus`;
- `trialUntil`;
- limits;
- entitlement overrides;
- `canUse()`;
- `getLimit()`;
- upgrade/downgrade;
- demo mode;
- backend validation por plano;
- testes Basic/Pro/Premium/Demo;
- checkout/assinatura da plataforma.

## Arquitetura alvo — NEXT

Modelo conceitual recomendado:

```text
tenants/{tenantId}
  planId
  subscriptionStatus
  trialUntil?
  entitlementOverrides?
  limitOverrides?

plans/{planId}
  name
  status
  features{}
  limits{}
  priceSnapshot?  # somente se fizer sentido; pricing comercial pode viver em config controlada
```

Status de assinatura:

```text
trial
active
past_due
suspended
cancelled
demo
```

## Serviço de entitlement

Criar no futuro uma fronteira única:

```ts
canUse(tenant, feature)
getLimit(tenant, limit)
resolveEntitlements(tenant)
```

Resolução:

```text
base plan
+ tenant entitlement overrides
+ tenant limit overrides
= effective entitlements
```

Nunca espalhar:

```ts
if (tenant.id === "sol-de-verao")
```

## Feature flags atuais

As flags atuais podem continuar existindo para capacidades operacionais/configuração, mas precisam ser separadas conceitualmente de entitlement comercial.

Exemplo:

```text
ENTITLEMENT: tenant tem direito a delivery
CONFIG: tenant ativou delivery
```

Condição efetiva:

```text
canUse("delivery") && tenantConfig.deliveryEnabled
```

## Backend / Rules

Feature gating não pode existir somente na interface.

Para operações premium que alterem dados ou executem lógica privilegiada, o lado confiável precisa validar entitlement.

A implementação exata depende da arquitetura que for usada para comandos privilegiados (Rules, Functions, Worker ou combinação).

**Não modificar Firestore Rules nesta versão apenas para simular um entitlement system que ainda não existe.**

## Limites

Limites propostos inicialmente:

```text
users: 2 / 5 / 15
drivers: 1 / 5 / 15
```

Pedidos não recebem limite comercial inicial nesta proposta.

A implementação futura deve contar recursos de forma segura e resistente a concorrência antes de bloquear criação.

## Demo

Tenant demo futuro:

```text
planId = premium_demo
subscriptionStatus = demo
```

Demo não é exceção hardcoded por slug.

## Testes obrigatórios quando este delta for implementado

Criar tenants:

- `tenant-essential`
- `tenant-pro`
- `tenant-premium`
- `tenant-demo`

Validar:

- UI gating;
- route gating quando aplicável;
- backend/rules/service gating;
- limites;
- override positivo;
- override negativo;
- downgrade preservando dados;
- subscription suspended;
- demo premium;
- Tenant A × Tenant B continua isolado.

## O que esta versão fez

Apenas documentou a arquitetura e o delta.

**Nenhum entitlement é declarado implementado.**

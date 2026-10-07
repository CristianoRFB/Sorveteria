# ARCHITECTURE

## Ecossistema

Este repositório implementa somente a vertical **Sorveteria**.

Princípio do Core:

> Multi-Tenant dentro de cada vertical. Integração entre verticais somente quando houver necessidade real.

## Runtime conceitual

Cloudflare
→ React/Vite
→ Tenant Resolver
→ Firebase Auth / Firestore / Storage

## Tenancy

- `tenantId` é obrigatório para dados pertencentes ao estabelecimento;
- `memberships/{tenantId}_{uid}` torna autorização consultável nas Rules;
- `platform_owner` é uma claim global;
- tenants podem ser `active`, `suspended`, `onboarding` ou `archived`;
- suspensão não exclui dados.

## Shared deploy

Um deploy atende múltiplos tenants da vertical Sorveteria.

Novo tenant deve ser onboarding/configuração, não fork de código.

## White-label

Tenant config controla branding e features sem duplicar o motor.

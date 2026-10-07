# ZIP MANIFEST — v02 Pricing Protocol

## Código preservado

- React/Vite foundation
- Firebase bootstrap
- tenant resolver
- roles / feature flags / modelos
- QR Code local
- storefront / menu / tracking / admin shells
- testes unitários iniciais

## Runtime alterado nesta versão

- copy da landing ajustada para não apresentar features planejadas como produto pronto;
- preview de pricing explicitamente marcado como **PROPOSTA / ainda não disponível para contratação**.

## Documentação nova

- `FEATURE_INVENTORY.md`
- `PRICING_MARKET_RESEARCH.md`
- `PRICING_AND_PLANS.md`
- `ENTITLEMENTS_DELTA.md`
- `DEMO_AND_LANDING.md`
- `PRICING_REFACTOR.md`
- roadmap NOW/NEXT/DEFERRED atualizado

## Não implementado nesta versão

- entitlement service;
- plan catalog runtime;
- subscription state runtime;
- billing;
- checkout de assinatura;
- backend feature gating por plano;
- upgrade/downgrade runtime.

A ausência é intencional para obedecer à regra anti-falsa-implementação do protocolo.

## v03-pricing-executive

Pacote executivo/técnico criado sem nova auditoria e sem alteração de runtime:

- `docs/versions/v03-pricing-executive/FEATURE_MATRIX.md`
- `docs/versions/v03-pricing-executive/FEATURE_MATRIX.csv`
- `docs/versions/v03-pricing-executive/PRICING_AND_PLANS.md`
- `docs/versions/v03-pricing-executive/DELTA_TECNICO.md`
- `docs/versions/v03-pricing-executive/PRIORIZACAO.md`
- `docs/versions/v03-pricing-executive/DECISOES.md`
- `docs/versions/v03-pricing-executive/REFATORACAO_DO_ENTREGAVEL.md`
- `docs/versions/v03-pricing-executive/STATUS.md`

Runtime: preservado sem alterações.

## v04-pricing-decisions-approved

Fechamento de decisões da vertical, sem nova auditoria e sem alteração de runtime:

- `docs/versions/v04-pricing-decisions-approved/README.md`
- `docs/versions/v04-pricing-decisions-approved/STATUS.md`
- `docs/versions/v04-pricing-decisions-approved/DECISOES_APROVADAS.md`
- `docs/versions/v04-pricing-decisions-approved/PRICING_AND_PLANS.md`
- `docs/versions/v04-pricing-decisions-approved/PRIORIZACAO.md`
- `docs/versions/v04-pricing-decisions-approved/GLOBAL_CONSOLIDATION_HANDOFF.md`

Status:
- decisões comerciais da vertical: APROVADAS;
- runtime: preservado;
- Codex/GOAL: não gerado;
- consolidação global: próxima etapa.

## v05-global-consolidation-ready

Normalização canônica para comparação entre verticais.

Arquivos canônicos:
- `docs/versions/v05-global-consolidation-ready/DECISIONS_APPROVED.md`
- `docs/versions/v05-global-consolidation-ready/PRICING_AND_PLANS_APPROVED.md`
- `docs/versions/v05-global-consolidation-ready/FEATURE_MATRIX_APPROVED.md`
- `docs/versions/v05-global-consolidation-ready/DELTA_TECNICO.md`
- `docs/versions/v05-global-consolidation-ready/PRIORIZACAO.md`
- `docs/versions/v05-global-consolidation-ready/GLOBAL_CONSOLIDATION_HANDOFF.md`

Status:
- READY_FOR_GLOBAL_CONSOLIDATION
- OPEN_DECISIONS=0
- runtime não alterado
- preços não reavaliados
- decisões aprovadas preservadas
- GOAL Codex não gerado



## CODEX_READY_BASE

- Target repo: `CristianoRFB/Sorveteria`
- Repo state at packaging: EMPTY
- Source code: included
- `CODEX_NEXT_GOAL.txt`: included
- `AGENTS.md`: included
- `docs/STATUS.md`: included
- `docs/NEXT_CODEX_STEP.md`: included
- Runtime code changed in this packaging step: NO
- Pricing decisions changed: NO
- Global stage changed: NO (`CORE_FIRST`)

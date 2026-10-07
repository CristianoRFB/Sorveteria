# REFATORACAO_DO_ENTREGAVEL

## Entregável ativo identificado

**ZIP:** `SAAS_SORVETERIA_PRICING_PROTOCOL_v02.zip`

Não foi encontrado GOAL destinado ao Codex dentro do entregável ativo.

Portanto:

- **não foi criado `GOAL_PRICING_ENTITLEMENTS`**;
- o runtime não foi alterado para fingir planos;
- a refatoração desta rodada é documental/executiva e mantém o código do v02 intacto.

## O que entra agora

Entram apenas artefatos de decisão e execução:

- `FEATURE_MATRIX.md` + `.csv`;
- `PRICING_AND_PLANS.md`;
- `DELTA_TECNICO.md`;
- `PRIORIZACAO.md`;
- `DECISOES.md`;
- este documento;
- `STATUS.md`;
- `README.md` executivo.

## O que NÃO entra agora em código

- PlanCatalog;
- EntitlementService;
- planId/subscription runtime;
- limits engine;
- demo mode;
- backend gating;
- pricing checkout;
- gateway;
- upgrade/downgrade;
- testes por plano.

Esses itens permanecem `NEXT` ou `DEFERRED`.

## Resultado

O ZIP v03 passa a ser o pacote ativo de decisão de pricing, enquanto o runtime permanece no mesmo estado real do v02.

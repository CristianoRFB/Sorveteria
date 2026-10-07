# SaaS Sorveteria — CODEX READY BASE

Este ZIP é a **base de código real** para o repositório atualmente vazio:

`CristianoRFB/Sorveteria`

## Fonte de verdade

- codebase: este ZIP;
- decisões comerciais canônicas: `docs/versions/v05-global-consolidation-ready/`;
- próximo trabalho: `CODEX_NEXT_GOAL.txt`.

## Estado

```text
GLOBAL_STAGE=CORE_FIRST
OPEN_DECISIONS=0
PRICING=APPROVED
ENTITLEMENTS=NOT_IMPLEMENTED
BILLING=DEFERRED
CODEX_NEXT_GOAL=READY
```

A base contém React + TypeScript + Vite + Firebase, tenant resolver, domínio multi-tenant inicial,
Rules, modelos de order/delivery, white-label/QR e documentação histórica/canônica.

Ela **não é production-ready**. O próximo GOAL existe justamente para concluir Auth/memberships/RBAC,
isolamento Tenant A × Tenant B, Platform Owner, catálogo, carrinho, checkout, pedidos, tracking e
delivery antes do Global Standard v01 de entitlements.

## Uso no repositório vazio

Extraia **o conteúdo do ZIP na raiz** do clone de:

```text
https://github.com/CristianoRFB/Sorveteria.git
```

Depois abra essa pasta/repositório no Codex e use:

```text
CODEX_NEXT_GOAL.txt
```

Não crie outro projeto paralelo.

## Execução local

```bash
npm install
npm run test
npm run lint
npm run build
npm run test:rules
```

A instalação das dependências não foi concluída no ambiente que empacotou este ZIP por timeout,
portanto build/testes não são declarados como PASS neste artefato.

## Firebase

A configuração existente usa o projeto Firebase já definido para esta vertical.
Nenhuma service account ou segredo administrativo deve ser versionado.

## Documentação

Leia primeiro:

1. `docs/CURRENT.md`
2. `docs/STATUS.md`
3. `docs/NEXT_CODEX_STEP.md`
4. `docs/versions/v05-global-consolidation-ready/GLOBAL_CONSOLIDATION_HANDOFF.md`

Pricing aprovado permanece intacto. O GOAL não deve reavaliá-lo.

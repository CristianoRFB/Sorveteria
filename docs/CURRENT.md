# CURRENT

## Baseline histórica executável

`docs/versions/v06-multitenant-core-ready/` mantém a evidência **histórica** do Core v06 (não deve ser reescrita).

## Implementação atual — GOAL MASTER (branch, ainda sem go-live)

- `CORE_READINESS=PASS_V06`
- `GLOBAL_STANDARD_IMPLEMENTATION=IMPLEMENTED_IN_DEVELOPMENT_BRANCH`
- `CHECKOUT_CONCURRENCY=PASS_FIREBASE_EMULATOR`
- `PUBLIC_CATALOG=HTTPS_ALLOWLISTED_EMULATOR_TESTED`
- `DRIVER_ASSIGNMENTS=HTTPS_SCOPED_EMULATOR_TESTED`
- `DRIVER_FIRESTORE_INDEX=DRIVER_ID_UPDATED_AT_PRESENT`
- `CI_UNIT_RULES_INTEGRATION=101_11_20_PASS_AT_b9e8fa6b`
- `BROWSER_QA=THREE_CONSECUTIVE_FULL_SYNTHETIC_RUNS_PASS_66_REAL_SCREENSHOTS`
- `TRACKING_RESILIENCE=PUBLIC_CALLABLE_AND_EMULATOR_LONG_POLLING_THREE_EMULATOR_BROWSER_JOURNEYS_PASS`
- `STAGING=NOT_PROVISIONED_NOT_AUTHORIZED`
- `PRODUCTION_DEPLOYMENT=NOT_PERFORMED`
- `BILLING=NOT_IMPLEMENTED`
- `LEADS_CONFIRMED=0`

Branch em execução: `codex/goal-master-sorveteria-production-readiness`. Fonte do progresso verificável: [GOAL MASTER](GOAL_MASTER_EXECUTION.md). Scripts e bloqueios de release: [RELEASE PREFLIGHT](RELEASE_PREFLIGHT.md).

## Fonte comercial aprovada

`docs/versions/v05-global-consolidation-ready/` continua sendo a fonte de verdade para valores, limites e decisões de planos. Não alterar a matriz comercial sem nova aprovação.

**A CI verde em emuladores não significa que staging ou produção foram homologados.**

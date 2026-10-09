# Estado da versão

```text
SOURCE_BASELINE=docs/versions/v05-global-consolidation-ready/
GLOBAL_STAGE=CORE_FIRST
CORE_READINESS=READY_FOR_GLOBAL_STANDARD_IMPLEMENTATION
GLOBAL_STANDARD_IMPLEMENTATION=NOT_STARTED
PRICING_DECISIONS=APPROVED_AND_UNCHANGED
BILLING=NOT_IMPLEMENTED
PRODUCTION_DEPLOYMENT=NOT_PERFORMED
LEADS_CONFIRMED=0
```

## Gates executados

| Verificação | Evidência | Resultado |
|---|---|---|
| Unitários e domínio | `npm run test` — 20 testes em 7 arquivos | PASS |
| Lint | `npm run lint` | PASS |
| Build | `npm run build` | PASS |
| Firestore e Storage Rules | `npm run test:rules` — 11 testes, incluindo staff, membership ausente e cross-user | PASS |
| Integração | `npm run test:integration` — 2 jornadas, incluindo Platform Owner e pedido/entrega | PASS |
| QA no navegador | Jornada completa customer/owner/driver/Platform Owner; verificações direcionadas para negação cross-tenant do Driver e atualização de status pelo Owner | Jornada completa PASS com 21 capturas; verificações direcionadas PASS; 22 arquivos de screenshot catalogados |
| Diagramas | `npm run docs:diagrams` — arquitetura e fluxo pedido/entrega | PASS; fontes Mermaid e SVGs |
| Documentação | `npm run docs:check` — 14 arquivos Markdown, links e assets | PASS |
| Leads | `npm run docs:leads` | PASS; zero leads confirmados |
| Preços e limites | Baseline v05 e landing comparados | PASS, sem alteração |
| Billing/deploy | Configuração local e fluxo do produto | NÃO EXECUTADOS; fora do escopo e sem aprovação |

As suítes e a QA visual foram executadas nesta rodada. Uma jornada completa passou e salvou 21 capturas; verificações direcionadas também passaram para o bloqueio do Driver Alpha ao tentar abrir entregas Beta e para a atualização de status pelo Owner. Os 22 arquivos estão catalogados em [SCREENS.md](SCREENS.md). Checkout, storefront mobile, os dois contextos do Platform Owner, entrega concluída e as duas negações entre tenants foram inspecionados visualmente. Repetições posteriores da jornada completa tiveram timeouts intermitentes no tracking do navegador/emulador; por isso, elas não são contabilizadas como uma segunda execução completa aprovada. `docs/CURRENT.md` aponta para v06 e preserva v05 como fonte comercial.

Avisos observados sem falha nos gates: o emulator executa Node 24 do host embora `functions/package.json` solicite Node 20, e a CLI sinaliza uma versão de `firebase-functions` desatualizada. A descoberta das Functions usa 180 s e cada teste de integração 120 s para acomodar a inicialização lenta observada no host. O build passa; o Rollup remove comentários `@__PURE__` do Zod cuja posição não consegue interpretar. O seed local também emitiu `MetadataLookupWarning` de acesso à metadata externa, mas preparou com sucesso as 9 contas e os 2 tenants no Emulator Suite. Nenhuma implantação, Firebase de produção ou serviço pago foi acionado.

## Readiness A–H

| Requisito | Estado | Evidência atual |
|---|---|---|
| A. Tenant resolver confiável | PASS | Resolução por slug, status ativo, erro/loading e testes de resolução |
| B. Isolamento Tenant A × Tenant B | PASS | Regras e testes; jornadas com `tenant-alpha` e `tenant-beta` |
| C. Memberships e RBAC | PASS | Firebase Auth, memberships ativas, guards e testes Rules |
| D. Rules/backend tenant-aware | PASS | Rules deny-by-default; mutações privilegiadas em callable Functions |
| E. Platform Owner | PASS | Criação, ativação, contexto, suspensão, reativação e audit no teste de integração |
| F. Fonte de verdade definida | PASS | Baseline comercial v05 preservada e esta versão registra o estado executável |
| G. Estados de features auditados | PASS | [Matriz implementada](FEATURE_STATES.md) separa disponível, parcial e fora de escopo |
| H. Pricing e feature matrix aprovados | PASS | Documentos canônicos v05 preservados; landing mantém valores e ressalva de não contratação |

Com todos os requisitos A–H em PASS, o core está pronto para um goal posterior dedicado ao Global Standard v01. Esse padrão permanece não implementado nesta versão.

## Limitações conhecidas

- Os dados alpha/beta e usuários seed existem apenas nos emuladores locais.
- A contratação SaaS, cobrança, gestão de plano e enforcement comercial não estão disponíveis.
- A matriz visual e os arquivos de screenshot são evidência local de execução; não representam ambiente de produção.

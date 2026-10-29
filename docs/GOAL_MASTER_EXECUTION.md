# Goal Master — registro de execução

```text
GOAL=CODEX_GOAL_MASTER_SORVETERIA_PRODUCTION_READY.txt
STARTED=2026-10-09
BRANCH=codex/goal-master-sorveteria-production-readiness
BASE_COMMIT=bac1e4b5634a037ce9923ad960fbd67c7c3c80ac
BASELINE_TREE=CLEAN
STAGING_AUTHORIZATION=NOT_PROVIDED
PRODUCTION_AUTHORIZATION=NOT_PROVIDED
REAL_DATA_MIGRATION=NOT_AUTHORIZED
```

## Regras de retomada

- Continuar nesta branch e ler este arquivo antes de retomar.
- Não publicar, fazer deploy, migrar dados reais ou provisionar recursos pagos.
- Não gravar segredos, dados pessoais ou credenciais de fixtures neste registro.
- O Emulator Suite usa exclusivamente o projeto local `demo-sorveteria`.
- Repetir apenas os gates afetados por mudanças; nunca tratar evidência v06 como resultado de um gate novo.

## Fase 0 — baseline

Ambiente observado em 09/10/2026: Node `v24.11.1`, npm `11.6.4`; `functions/package.json` exige Node 20. O checkout começou limpo em `main`, exatamente no commit-base solicitado, que agora está preservado nesta branch.

| Gate/comando | Resultado da baseline | Evidência |
|---|---|---|
| `npm ci` | PASS | 958 pacotes; npm reportou 20 vulnerabilidades na árvore completa (6 moderadas, 12 altas, 2 críticas). |
| `npm --prefix functions ci` | PASS com aviso de engine | 253 pacotes; 8 vulnerabilidades moderadas; runtime atual Node 24 diverge de Node 20 declarado. |
| `npm run test` | PASS | 20 testes em 7 arquivos. |
| `npm run lint` | PASS | ESLint sem erros. |
| `npm run build` | PASS | Vite/TypeScript; Rollup emitiu avisos `@__PURE__` de Zod. |
| `npm run test:rules` | PASS | 11 testes Firestore/Storage Rules no Emulator Suite. |
| `npm run test:integration` | PASS | 2 jornadas no Emulator Suite; seed criou dados sintéticos locais. |
| `npm run docs:diagrams` | PASS | arquitetura e fluxo order/delivery renderizados. |
| `npm run docs:check` | PASS | 14 Markdown da versão canônica v06. |
| `npm run docs:leads` | PASS | zero leads reais confirmados. |
| `npm audit --omit=dev` | FAIL de segurança | 4 alertas altos na árvore de produção via `@grpc/grpc-js@1.9.16` incluído por `@firebase/firestore`. |
| `npm --prefix functions audit` | FAIL de segurança | 8 alertas moderados transitivos via `uuid@9.0.1` em bibliotecas Google. |

Tracking intermitente permanece um problema conhecido da v06 e ainda não foi reclassificado nem corrigido nesta execução. A baseline completa de navegador repetível de F2 ainda não foi iniciada.

## Gates e checkpoints

| Fase | Estado | Evidência/observações |
|---|---|---|
| F0 — baseline e branch | PASS | Base exata; branch isolada criada; baseline de instalação, testes e docs registrada. |
| F1 — Global Standard v01 | IN_PROGRESS | Próximo: PlanCatalog local, estado comercial, EntitlementService e testes. |
| F2 — estabilidade, regressão e concorrência | NOT_RUN | Inclui diagnóstico causal e E2E repetido do tracking, não aumento cego de timeout. |
| F3 — infraestrutura e staging | NOT_RUN | Preparação local permitida; staging real depende de destino e autorização explícitos. |
| F4 — homologação | NOT_RUN | Emulator não pode ser declarado como staging; piloto depende de participação real. |
| F5 — release e preflight | NOT_RUN | Produção não autorizada nem executada. |
| F6 — documentação final | NOT_RUN | Será criada nova versão após as mudanças e os gates. |

`NEEDS_USER_ACTION`: confirmar destino, conta/permissões e autorização para provisionar/deployar staging, além de região/plano/custos, antes de qualquer cloud real. Autorização de staging não autoriza produção nem migração de dados reais.

`NEXT_ACTION`: implementar o catálogo de planos e a resolução de entitlement com fail-closed para estado comercial ausente/inválido; migrar somente fixtures/emulador; adicionar testes unitários antes de aplicar gates nas Functions.

## Checkpoint de implementação — 2026-10-29 (GitHub Chat)

Os registros de F0 acima são históricos. Para continuidade, prevalece o estado desta seção.

- Branch: `codex/goal-master-sorveteria-production-readiness`.
- Baseline anterior: `2fa883704825935be79ffbdb762fc145f7ccc3cb`; `main` não foi modificada.
- Código publicado: proteção contra `planId` herdado de `Object.prototype`, validação de trial/assinatura inválida, checkout idempotente em transação Firestore, replay sem segredo de entrega, tentativas persistentes por tenant no cliente, tracking com timeout/retry visível e atualização que pausa ao ocultar a aba ou concluir o pedido.
- Regressões publicadas: limites de plano, relógio inválido, checkout idempotente, timeout, política de refresh e teste com chamadas concorrentes no Emulator Suite.
- Correção da vulnerabilidade `GHSA-gg6h-894w-4m9c`: dependência transitiva `re2js` atualizada de 2.8.6 para 2.8.7 e fixada em `package.json` / `package-lock.json`.
- Evidência de qualidade: GitHub Actions para `f2c4cecb927c629764a47d5d81679b2e62bebec9`, runs `40972523836` e `40972530754`, ambas concluídas com **success**. Nos gates anteriores da mesma sequência houve **66/66 testes unitários**, **11/11 Rules** e **4/4 integração**, incluindo concorrência do checkout; build/lint/documentação passaram. `npm audit --omit=dev --audit-level=high` foi aprovado após a correção da dependência.
- Prontidão geral estimada: **~74%** até produção; estimativa de trabalho, **não** comprovação de staging ou go-live. Nenhuma cobrança automática, migração real, staging real ou deploy de produção foi realizado.

### Estado por fase após os commits

| Fase | Situação real |
|---|---|
| F1 — Global Standard | Implementação funcional de catálogo, entitlements e estados comerciais, com reforço fail-closed; critérios de operação real ainda sujeitos à homologação. |
| F2 — estabilidade | Checkout idempotente e concorrência aprovados no Emulator Suite. Tracking ficou mais resiliente; diagnóstico causal de timeouts intermitentes em navegador e E2E prolongado ainda pendente. |
| F3 — infraestrutura/staging | Configuração e credenciais de ambiente externo não foram autorizadas; não provisionar por inferência. |
| F4 — homologação | Piloto/cliente e staging real não executados. |
| F5 — go-live | PROIBIDO até autorização explícita, confirmação do destino, backup/rollback e preflight aprovado. |
| F6 — documentação final | Este checkpoint atualizado; documentação final/versionamento canônico ainda pendentes. |

**Próxima ação de implementação (sem reiniciar auditoria):** confirmar o novo SHA da branch; preparar preflight de staging somente leitura, diagnosticar timeouts causais em E2E repetido e completar runbooks/artefatos de segurança; executar todos os gates afetados. **Não interpretar CI no projeto `demo-sorveteria` como staging real.**

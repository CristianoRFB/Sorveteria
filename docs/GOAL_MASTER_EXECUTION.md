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

## Continuação publicada — 2026-10-29 | F3/F5 preparação, F2 diagnósticos

- Baseline técnico de retomada desta rodada: `9422319f550ccae0731386307fb2953d78736a7a`.
- Preflight offline `scripts/release-preflight.mjs` e avaliação estrutural `scripts/lib/release-readiness.mjs`, com testes de ausência de autorização, separação de staging/produção, rejeição de arquivos sensíveis, SHA, Rules, índices, Firebase Node 22 e decisão explícita sobre migração real.
- `docs/RELEASE_PREFLIGHT.md` documenta preparação, backup/restore, rollback, evidências e autorizações independentes para staging, produção e migração; nenhum recurso externo foi provisionado.
- `.env.example` permanece público/permitido; segredos reais `.env.*`, certificados e service accounts são proibidos no Git.
- Teste de tracking adicional no Firebase Emulator faz 24 leituras repetidas e concorrentes de um código Alpha, verifica ausência de campos privados e impede que o código represente um pedido Beta. Execução intermediária observou 24/24 leituras, latência máxima de 825 ms. **Não substitui** repetição do tracking via navegador.
- Builds hospedados passam a rejeitar projeto demo, configurações Firebase incompletas e emuladores locais.
- `docs/CURRENT.md` e `README.md` foram sincronizados com a branch de implementação e não declaram staging ou produção como concluídos.
- CI observada para `740e89642c207d928ec8e96054ef0940e0a7647b`: dois workflows concluíram com sucesso, incluindo preflight que reporta `BLOCKED` para produção sem evidências. A CI completa do código posterior deve ser consultada por SHA, sem presumir aprovação.
- `ESTIMATIVA_GERAL=79%` até prontidão de produção; percentual **estimado**, não métrica comprovada por staging.
- **Bloqueios externos:** destino/conta/permissão/custos do Firebase staging, autorização explícita de provisionamento, evidências de backup/restore e rollback, testes E2E repetidos no navegador, piloto real, autorização separada de produção e de qualquer migração real.

**NEXT_ACTION:** verificar CI do último SHA e corrigir falhas reais; executar diagnóstico causal de tracking no navegador, preparar infraestrutura de staging só após autorização específica. Não reiniciar auditoria geral.

## Continuação F2/F3/F5 — evidências de 29/10/2026

- **Código:** tracking público substituiu leitura WebChannel Firestore por callable HTTP `getPublicOrderTracking` com projeção allowlist. Não expõe dados privados, valida tenant ativo, código público e contrato de resposta. As Rules originais foram preservadas.
- **Emulador:** `initializeFirestore` passou a usar `experimentalForceLongPolling` **somente quando VITE_USE_EMULATORS=true**. Configuração de produção fica intacta; a correção foi direcionada a travamentos reproduzidos no Chrome headless.
- **Diagnóstico causal:** primeira QA automática falhou no seed antes da porta Auth iniciar; segundo erro era clique indevido no botão de tracking durante consulta automática; terceiro teste identificou travamento real de WebChannel (Firestore ~45s) no tracking; uma callable eliminou a falha de tracking, mas o painel Owner também revelou travamento de leituras, mitigado por configuração do SDK em emulador.
- **Jornada completa de navegador:** GitHub Actions [run 40976263175](https://github.com/CristianoRFB/Sorveteria/actions/runs/40976263175) **PASS**, 22 capturas novas feitas de dados fictícios; inclui storefront desktop/mobile, checkout, tracking, painel Owner, entrega concluída, bloqueios Alpha×Beta, contexto Platform Owner, suspensão e reativação. Capturas dessa execução no artefato [sorv-browser-qa-40976263175](https://github.com/CristianoRFB/Sorveteria/actions/runs/40976263175/artifacts/12942503401). QA repetida ainda é gate independente.
- **CI verificável:** GitHub Actions [run 40976263189](https://github.com/CristianoRFB/Sorveteria/actions/runs/40976263189) **PASS**: 90/90 unitários, 11/11 Firestore/Storage Rules, 5/5 integração; incluindo 24 leituras Firestore de tracking no Emulator Suite (latência máxima observada 611 ms). Lint, TypeScript/build, documentação e `npm audit` sem alertas de produção passaram.
- **Staging e produção:** não provisionados; sem cliente piloto confirmado; nenhum deploy, migração real ou cobrança automática. `npm run release:preflight` continua fail-closed para qualquer ambiente sem manifestos e aprovação.
- **Estado estimado:** `GENERAL_READINESS_ESTIMATE=82_PERCENT` — projeção de preparação, não declaração de ambiente de produção validado.

**Próximas verificações críticas:** repetir E2E real no navegador e investigar qualquer nova intermitência; obter destino e autorização específica do staging; validar backup e restauração, IAM, secrets, monitoramento e piloto; somente depois preparar autorização independente de produção/migração.

## Continuação de implementação e evidências — 30/10/2026

- **Fonte de continuidade:** branch `codex/goal-master-sorveteria-production-readiness`; código funcional validado no SHA `4bb76a6c58d790d78e19b3a97f5f2704cc41e6d8`.
- **Catálogo público:** leitura por callable HTTPS de tenant ativo, projeção allowlist de categorias/produtos/opções, sem incluir metadados privados; testes negativos e isolamento Alpha/Beta. Paginação foi adicionada para não criar novo limite comercial de produtos.
- **Entregadores:** leitura de entregas atribuídas por callable HTTPS autenticada, usando `request.auth.uid` e membership ativa `driver`, nunca o `driverId` fornecido pelo cliente. Somente os detalhes necessários de pedidos atribuídos retornam ao frontend. O painel desmonta e reinicializa quando mudam tenant ou identidade Firebase.
- **Índice de produção:** criado índice composto `deliveries(driverId ASC, updatedAt DESC)` em `firestore.indexes.json`, junto com teste automatizado para a consulta atual.
- **CI do código:** [GitHub Actions run 40991247401](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991247401), **success**: 101/101 unitários, 11/11 Rules, 20/20 integração; TypeScript/build, lint e auditorias de dependências sem alertas. Preflight continua corretamente `BLOCKED` para produção não autorizada.
- **QA real de navegador:** uma jornada sintética completa anterior foi aprovada com 22 screenshots; requisito de três jornadas completas em sessões separadas está em execução e **não** deve ser marcado como PASS até obter relatório final. Não houve staging real, piloto, migração ou go-live.
- **Readiness estimado:** `GENERAL_READINESS_ESTIMATE=84_PERCENT`, apenas uma estimativa de avanço geral do GOAL MASTER. Não é autorização de deploy nem evidência de produção.
- **Próximo gate:** verificar resultado das três jornadas; se houver falha, corrigir a partir de logs/artefatos sanitizados. Para F3-F5, exigir projeto/conta Firebase real, autorização de custo, IAM/secrets, staging isolado, backup/restauração e aprovação separada de produção/migração.

## Gate F2 consolidado — três jornadas completas / commit `b9e8fa6b`

- **Código verificado:** `b9e8fa6bf7632add1270d168e117160896b48d61` na branch do GOAL MASTER.
- **E2E navegador:** [GitHub Actions run 40991724310](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991724310) finalizado com **success**, três execuções completas, cada qual em sessão isolada do Chrome, **22 screenshots novas por execução = 66 capturas reais** no Emulator Suite. Artefato: [sorv-browser-qa-40991724310](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991724310/artifacts/12949478037). Cada execução percorreu checkout, tracking, Owner, catálogo, Driver, entrega concluída, negação Alpha×Beta e Platform Owner; sem clientes reais.
- **CI código:** [run 40991724298](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991724298), **success**: **101/101** testes unitários, **11/11** Rules e **20/20** integrações; lint, build, diagramas e manifestos aprovados; `npm audit --omit=dev --audit-level=high` e equivalente Functions com **0 vulnerabilidades**. O preflight de produção segue **BLOCKED** intencionalmente por falta de autorização e evidências externas.
- **Consertos desta sequência:** projeção allowlist de dados aninhados nos pedidos administrativos, rejeição de chaves de protótipo em seleções, gatilho obrigatório de QA ao alterar a tela Driver e checagem de limpeza de sessão pelo Firebase Auth em vez de abrir IndexedDB durante a remoção de armazenamento.
- **F2 no Emulator Suite:** `LOCAL_BROWSER_STABILITY=PASS_THREE_CONSECUTIVE_RUNS`. Isso **não** comprova confiabilidade no Firebase hospedado ou em dispositivos reais. Não tratar F3/F4/F5 como concluídas.
- **Readiness global estimado:** `GENERAL_READINESS_ESTIMATE=86_PERCENT` — estimativa operacional, **não** autorização de produção.
- **Bloqueios externos inalterados:** projeto e credenciais de staging realmente autorizados, custos, IAM, secrets, backup/restauração comprovados, testes hospedados, piloto real quando houver, domínio e revisão dos alertas/rollback. Produção e qualquer migração de dados reais exigem autorização específica independente.

**NEXT_ACTION:** prosseguir de `b9e8fa6b`, confirmar se a branch mudou e só repetir gates afetados; preparar documentação e infraestrutura de staging sem execução cloud até autorização. Preservar `main`, v05 comercial e v06 histórica.

## Continuação de segurança — 30/10/2026 | backend, Rules e preflight

- **Código verificado:** `3afa3cec64f0d69c37073a49afd24c4fffdbe533` nesta branch. `main` preservada.
- **CI aprovada:** [run 41057102505](https://github.com/CristianoRFB/Sorveteria/actions/runs/41057102505), **112/112 unitários, 12/12 Firestore/Storage Rules e 20/20 integrações**. Build, TypeScript, ESLint, diagramas/documentos e auditorias de dependências concluídos; 0 vulnerabilidades nas auditorias de produção.
- **Privacidade Driver:** projeção HTTPS allowlist de pedido, endereço, cliente e status; coerência obrigatória de `tenantId`, `driverId` e UID no backend. Rules agora negam aos entregadores leitura direta dos documentos brutos de `orders` e `deliveries`; o painel utiliza `getDriverAssignments`. Teste de integração verifica a negação e a leitura projetada.
- **Privacidade Cardápio:** Rules negam leituras públicas brutas de `categories` e `products`; a API `getPublicCatalog` mantém a projeção pública autorizada, paginação e isolamento Alpha/Beta.
- **Tracking:** eventos `delivery_attempt_failed` podem aparecer na timeline pública; não podem ser usados como status principal do pedido. UI traduz essa tentativa e teste unitário cobre a regressão.
- **Membership:** Firestore `membership` precisa conter exatamente o tenant e UID esperados, mesmo quando o documento possui role privilegiada; validação inserida nos caminhos críticos de administração e entrega.
- **Release:** preflight offline exige checkout Git limpo e SHA exato; domínios reservados de documentação não satisfazem gate. Continua **BLOCKED** sem evidências reais e aprovação.
- **QA navegador:** as três jornadas (66 capturas) do checkpoint anterior continuam evidência histórica. O código endurecido desta sequência ainda requer sua própria execução/revisão no navegador. O workflow passou a reagir a alterações nas Rules e projeções de dados.
- **Readiness:** `GENERAL_READINESS_ESTIMATE=88_PERCENT` (estimativa, não homologação). Sem staging autorizado, cloud real, piloto, cobrança automática, migração ou deploy de produção.

**NEXT_ACTION:** consultar CI e Browser QA para o novo HEAD; corrigir somente os gates afetados. Obter autorização específica para staging e comprovar custos, IAM/secrets, backup/restauração e rollback antes de tentar qualquer deploy. Preservar v05 comercial e v06 histórica.

## Continuação GOAL MASTER — 31/10/2026 | privacidade pública, checkout e identidade visual

- **Ponto de partida verificado:** `f98a512272b48ce15d74b04bcc4ff029b58bb759`.
- **Código final validado na CI:** `e55787583a5b03bb7b75c13ada45c2180e5744a4` (branch `codex/goal-master-sorveteria-production-readiness`); runs [41223262874](https://github.com/CristianoRFB/Sorveteria/actions/runs/41223262874) e [41223267993](https://github.com/CristianoRFB/Sorveteria/actions/runs/41223267993), **success**. **121/121 unitários + 13/13 Rules + 24/24 integrações = 158 testes**, TypeScript/build, lint, docs, diagramas, audit de dependências (0 vulnerabilidades reportadas) e preflight estrutural de produção corretamente `BLOCKED`.
- **Segurança de tenant:** a resolução pública agora usa `getPublicTenant` com o mapa privado `tenantSlugs` e projeção de branding, flags e estado comercial necessário à UI. Firestore nega leitura direta de `tenants` a clientes, staff, caixas e entregadores; acesso bruto apenas a administradores do tenant e Platform Owner. Slug inexistente, onboarding e suspensão não retornam perfil público.
- **Segurança do checkout:** `getPublicCheckoutSettings` devolve somente métodos de pagamento habilitados e campos autorizados. A leitura direta de `settings/main` está restrita a administradores. `createOrder` revalida taxa, estimativa e meios de pagamento do Firestore antes de gravar valores; `updateTenantSettings` rejeita IDs duplicados e instruções inválidas ou excessivas.
- **Tracking:** o documento bruto `publicOrderTracking` ficou privado, enquanto `getPublicOrderTracking` mantém consultas públicas por código com allowlist. O teste de confiabilidade executa 24 consultas concorrentes por HTTPS e verifica isolamento Alpha×Beta e rejeição de leitura direta.
- **White-label:** tema por tenant passou a abranger todas as rotas da loja, inclusive cardápio, carrinho e checkout, com contraste calculado para botões e fallback de cores inválidas.
- **Catálogo:** fotos HTTPS dos produtos são exibidas com lazy loading, `alt` e fallback visual para imagens indisponíveis. URL segura e ausência de campos privados têm regressão unitária.
- **E2E de navegador:** as três jornadas com 66 screenshots aprovadas no checkpoint anterior permanecem válidas como evidência histórica. **A QA do novo layout no SHA `6afc8c62` estava em execução quando este registro foi escrito; conferir resultado final antes de promover o gate novo.** Os commits posteriores `e5578758` alteraram apenas teste unitário; não houve nova alteração de código funcional após `6afc8c62`.
- **Estimativa geral:** `GENERAL_READINESS_ESTIMATE=90_PERCENT`, somente projeção de preparação. **Staging hospedado, IAM/secrets, custo, backup/restore, dispositivos reais, piloto, autorização de produção e migração real permanecem pendentes.** Nenhuma cobrança, deploy real, provisionamento ou migração foi executada.

**NEXT_ACTION:** verificar QA browser `6afc8c62` e consolidar evidências; retomar a partir do último SHA verificado sem repetir gates históricos. Qualquer staging real exige destino Firebase e autorização específica; produção/migração exigem aprovações separadas. Preservar matriz v05, Core v06 e `main`.

## Continuação — 31/10/2026 | Resumo básico de vendas e editor de imagens

- **SHA inicial verificado:** `ee418ab9235f4309bfa549c0875084e0bad9ac94`, com CI e QA antigas aprovadas.
- **Último código com CI aprovada:** `0f0258ba9eec6dd335fccbca4e0bea8c583761ad`, [GitHub Actions 41227839272](https://github.com/CristianoRFB/Sorveteria/actions/runs/41227839272): **126/126 unitários, 13/13 Firestore/Storage Rules e 30/30 testes de integração = 169/169**, além de build, ESLint e preflight de produção bloqueado conforme política. Auditoria `--audit-level=high` passou (0 high/critical); existem **6 avisos moderados** em dependências Functions, que não devem ser chamados de zero vulnerabilidades.
- **Primeira feature faltante do Essencial concluída:** `basic_sales_summary` alterada de `not_implemented` para `implemented` em `functions/domain/feature-availability.json` (sem mudar a matriz comercial). Callable autenticada `getTenantSalesSummary` autorizada para Platform Owner e membros ativos de operação, com `tenantId` sempre validado no backend, dias exclusivamente 7 ou 30, bloqueio por entitlement e agregações indexadas Firestore `count/sum` em todos os pedidos criados no período. Contabiliza concluídos (`delivered`/`picked_up`), cancelados e em andamento. **O valor dos concluídos NÃO representa conciliação financeira ou pagamento efetivo.**
- **Painel:** nova aba `Resumo de vendas` com seletor de período, atualização manual, seis métricas, loading/erro e nota clara de limites financeiros; sem informações pessoais. Teste QA do navegador passa pela aba sem mudar contrato de 22 screenshots por jornada.
- **Fotos reais administráveis:** formulário do catálogo agora permite adicionar, alterar e remover URL HTTPS de foto; schema Zod + Functions validam URL e limite de caracteres; envio explícito de string vazia grava `imageUrl:null` e remove a foto, preservando comportamento de clientes antigos ao omitir o campo. Testes de integração verificam projeção pública, exclusão, HTTPS inválido e cross-tenant.
- **QA navegador da nova rodada:** run [41227819110](https://github.com/CristianoRFB/Sorveteria/actions/runs/41227819110), commit funcional `0942922a`; ainda em execução no momento da documentação. Não marcar como aprovada antes da conclusão.
- **Cobertura de catálogo verificável:** 17 funcionalidades `implemented` de 34 registradas (= **50%**). Há 17 pendentes, principalmente recursos Pro/Premium. **Prontidão operacional geral estimada = 91%** (90% antes), métrica subjetiva do núcleo do GOAL MASTER; **não é 91% do escopo comercial completo** nem certificação de produção.
- **Sem cloud real:** staging, IAM, secrets, backup/restauração, piloto, faturamento automático, homologação e deploy permanecem pendentes e dependem de autorização específica. `main`, v05 comercial e v06 histórica intactas.

**NEXT_ACTION:** verificar browser QA 41227819110 e CI do SHA final, corrigir apenas falhas novas; após isso, escolher a próxima funcionalidade `not_implemented` da matriz aprovada e cobrir backend + UI + integrações. Nunca realizar deploy sem autorização.

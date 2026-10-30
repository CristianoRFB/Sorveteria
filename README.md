# SaaS Sorveteria — 77 | Multi-tenant / White-label

Aplicação **React + TypeScript + Vite + Firebase (Auth, Firestore, Functions e Storage)**, com storefront, catálogo, carrinho, checkout, pedidos, tracking, administração, entregadores e Platform Owner. Cada sorveteria é isolada por tenant, memberships e Rules/Functions.

> **Estado:** desenvolvimento avançado do GOAL MASTER; **não publicado em produção**. Não existe contratação/cobrança automática ativa. Staging real e homologação com cliente piloto ainda requerem ambiente, acesso e autorização explícitos.

## Fontes de verdade e histórico

- **Preços, planos e limites aprovados:** `docs/versions/v05-global-consolidation-ready/` (preservar).
- **Core v06 concluído:** `docs/versions/v06-multitenant-core-ready/` (evidência histórica, não refazer).
- **Implementação em curso:** branch `codex/goal-master-sorveteria-production-readiness`.
- **Status verificável e gates por fase:** [GOAL MASTER](docs/GOAL_MASTER_EXECUTION.md) e [CURRENT](docs/CURRENT.md).
- **Preflight e runbook de release:** [RELEASE PREFLIGHT](docs/RELEASE_PREFLIGHT.md).
- Os documentos v05/v06 são históricos. Sua redação original não substitui o código atual da branch.

## Execução local (Node 22 + npm)

```bash
npm ci
npm --prefix functions ci
npm run test
npm run lint
npm run build
npm run test:rules
npm run test:integration
npm run docs:diagrams
npm run docs:check
npm run docs:leads
```

`npm run test:rules` e `npm run test:integration` exigem o Firebase Emulator Suite; a suíte de integração usa **somente** o projeto fictício `demo-sorveteria` e seeds sintéticos. A CI executa esses gates, mais auditorias de vulnerabilidades. O comando de integração inicia emuladores locais separados e **não** usa conta Firebase real.

```bash
npm run emulators
# Em outro terminal:
npm run dev:emulator
```

## Restrições de segurança e operação

- Toda operação sensível valida tenant, membro, papel e plano no backend/Rules. Dados Alpha e Beta devem permanecer isolados.
- O checkout usa uma tentativa UUID idempotente, reconhecida em transação Firestore. Repetir uma tentativa não cria outro pedido nem reexpõe o código privado de entrega.
- Tracking tem prazo máximo para leitura e refresh com pausa em abas ocultas, finalização em estados terminais e backoff de falhas. **A jornada E2E local foi aprovada três vezes consecutivas no Emulator Suite; staging hospedado ainda não foi validado.**
- Planos, períodos de avaliação, limites, overrides e atribuição manual estão implementados. Billing automático **não** está aprovado nem implementado.
- `.env.example` é apenas um modelo de campos públicos; arquivos `.env.*` reais, service accounts e certificados privados jamais devem ser versionados.
- Builds hospedados com projeto `demo-*`, placeholders Firebase ou `VITE_USE_EMULATORS=true` são rejeitados no startup.

## Preflight de staging e produção (somente leitura)

```bash
npm run release:preflight -- --environment staging --manifest /caminho/manifesto.local.json
```

Ele valida metadados, SHA, configuração Firebase e bloqueios. **Não executa deploy, cobrança nem migração.** Um resultado `EXTERNAL_REVIEW_REQUIRED` significa que ainda é necessária aprovação e verificação humana, não liberação para produção. Consulte o [runbook](docs/RELEASE_PREFLIGHT.md).

## Evidências e próximas etapas

Há CI com testes automatizados e Emulator Suite para checkout concorrente, regras e tracking repetido. Os resultados recentes e SHAs estão no [registro do GOAL MASTER](docs/GOAL_MASTER_EXECUTION.md). As três repetições de E2E no navegador local passaram com 66 screenshots reais de fixtures sintéticas. Ainda faltam staging autorizado, testes hospedados/dispositivos reais, homologação piloto e preflight final de produção.

**Nunca** interpretar a CI verde ou screenshots da v06 como aprovação de deploy público; nenhuma migração de dados reais nem deploy público foi autorizado.

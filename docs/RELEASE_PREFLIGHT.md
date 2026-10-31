# Sorveteria — preflight e liberação de ambientes

**Status:** preparação de F3 e F5, somente leitura. Nenhum ambiente cloud foi provisionado nem homologado por este documento.

> **Integridade do checkout (30/10/2026):** o preflight exige `git status --porcelain --untracked-files=normal` vazio, além do SHA exato; alterações locais e arquivos novos não versionados bloqueiam a revisão. Domínios reservados `example.com`, `.org` e `.net` não são evidências de destino real. Esses gates continuam **somente leitura** e não autorizam deploy.

## Escopo e autorização

O script `npm run release:preflight` realiza validação **offline** de metadados, SHA, caminhos de Rules, versão Functions Node 22, arquivo de índices e arquivos sensíveis rastreados no Git. Ele **não** autentica contra contas, não confirma permissões reais, não cria Secrets, não faz deploy, não publica frontend e não migra dados. Uma referência fornecida no manifesto **não comprova** que o procedimento real ocorreu.

O GOAL MASTER permite preparar infraestrutura e staging, mas exige **autorização explícita para provisionar ou implantar staging**, com identificação do projeto, região, conta conectada, permissões e custos. Produção, migração real e cobrança exigem autorizações próprias separadas. Nunca promover o ambiente `demo-sorveteria` a projeto real.

## Como executar o preflight local

Use Node 22 e um checkout Git íntegro da branch de desenvolvimento. Salve um JSON de metadados sem credenciais fora do repositório (ou num arquivo `.local.json` ignorado explicitamente). Exemplo **ilustrativo, não é uma aprovação real**:

```json
{
  "environment": "staging",
  "projectId": "substituir-por-projeto-real",
  "domain": "staging.substituir-dominio.com.br",
  "sourceSha": "SUBSTITUIR_PELO_SHA_COMPLETO_DE_40_CARACTERES",
  "approvalRef": "change/STAGING-APROVADO",
  "accessRef": "review/ACESSOS-VERIFICADOS",
  "costRef": "review/CUSTOS-APROVADOS"
}
```

```sh
git rev-parse HEAD
npm ci
npm run release:preflight -- --environment staging --manifest /caminho/manifesto.local.json
```

O script sai com código **2** quando há bloqueios e marca `EXTERNAL_REVIEW_REQUIRED` quando a estrutura está completa; **nunca** produz `READY_FOR_PRODUCTION` automaticamente. O modo `--allow-blocked` serve apenas ao smoke test da CI, não à liberação operacional. `--json` produz saída legível por máquina sem exibir dados submetidos.

## Checklist de infraestrutura — requer execução/verificação humana

1. Confirmar formalmente o dono da conta Firebase/Google Cloud, projeto e região; obter autorização de custos e revisar IAM de privilégio mínimo.
2. Configurar **Auth**, provedores e domínios autorizados. MFA para Platform Owner e vínculo por claims/membership autorizada; nenhuma promoção por e-mail hardcoded.
3. Revisar e aplicar **Firestore Rules**, **Storage Rules**, índices e **Functions Node 22** num projeto de staging isolado. Configurar segredos apenas via Secret Manager/ambiente protegido, nunca no Git.
4. Conferir configurações públicas `VITE_FIREBASE_*` do staging separadas de produção; validar que `VITE_USE_EMULATORS=false` no build de staging/produção.
5. Confirmar CDN/Hosting/domínio, certificados, CORS conforme o destino efetivo; implantar staging **somente após aprovação específica**.
6. Executar restauração de backup sintético e registrar evidência de RPO/RTO e reconciliação de permissões; não experimentar restore em tenant real.
7. Executar E2E em staging: checkout, pedidos, entrega, tracking repetido, celular, tentativa Alpha→Beta e Beta→Alpha, Owner, Driver e planos/limites.
8. Homologação com cliente piloto somente se houver cliente real e participação documentada; zero pilotos continua zero, sem inventar aprovação.
9. Produção exige outro preflight, ambiente explícito diferente do staging, aprovação de deploy **e de migração real**, se houver; confirmar monitoramento, health checks, alertas e rollback.

## Runbook de rollback (antes de implantação pública)

**Gatilhos:** erro de permissionamento/cross-tenant, duplicação de pedido, perda de dados, falha repetida do tracking, aumento abrupto de 5xx.

**Procedimento controlado:** suspender o rollout, registrar SHA e ambiente exatos, congelar alterações não essenciais, identificar última release aprovada, restaurar frontend/Functions pelo mecanismo oficial do destino (não pressupor que um simples revert restaura dados), comparar Rules e índices, revalidar Auth/tenant A×B e idempotência, conferir tracking e pedidos. Restaurar dados somente com plano de backup/teste de restore e autorização do responsável. Registrar incidentes, horário, evidências e reconciliação. Nunca apagar `checkoutRequests` ou IDs reais para "resolver" reenvios.

## Critérios para concluir o GOAL MASTER

- CI verde e testes automatizados no projeto de desenvolvimento.
- Evidence de restauração/rollback, custos, permissões e destino do staging.
- E2E do navegador repetido **sem timeout intermitente** e diagnóstico de falhas com traces sem segredos.
- Staging real homologado e cliente piloto apenas quando realmente houver.
- Go-live condicionado à autorização explícita e preflight manual; a aplicação nunca se autodeclara em produção.

## Migração de dados reais

No preflight de produção, informar obrigatoriamente `"migrationMode": "none"` quando não houver migração planejada, ou `"migrationMode": "required"` junto com uma referência documental separada em `"migrationApprovalRef"`. Mesmo com essas referências, o resultado máximo permanece `EXTERNAL_REVIEW_REQUIRED`; sem comprovação de autorização, a migração não pode acontecer.

O arquivo público `.env.example` é um **modelo sem credenciais** e pode ser versionado; arquivos reais `.env.*` são ignorados e proibidos no Git. A verificação de paths do preflight não revela o conteúdo de variáveis nem segredos.

## Proteção adicional no frontend

Em builds hospedados (`import.meta.env.PROD=true`), o módulo de Firebase impede inicialização com configurações públicas ausentes, projeto `demo-*`, domínio Auth `localhost` ou `VITE_USE_EMULATORS=true`. O CI pode compilar a aplicação com variáveis sintéticas, mas **a aplicação hospedada não pode iniciar** apontando para o ambiente de demonstração. Isso não substitui a revisão do bundle final do staging nem a aprovação de deploy.

## QA de navegador e diagnóstico local

Rode `npm run qa:screenshots` com Emulator Suite e frontend local ativos. Em falhas, o script grava somente eventos de tempo/status do Firestore (8088) e Functions (5001) em `.qa/`, pasta ignorada no Git, sem URLs, dados de clientes ou credenciais.

Configure `SORVETERIA_QA_BROWSER` para o caminho do Chrome/Edge instalado no computador e `SORVETERIA_QA_CDP_PORT` se 9333 estiver indisponível. Screenshots reais devem continuar separados de imagens conceituais e não comprovam staging/produção.

Uma jornada completa no navegador deve ser repetida e ter evidências reais antes de considerar a falha intermitente de tracking encerrada.

## Evidência nova de tracking e QA

O tracking público usa callable HTTP com projeção allowlist em vez de leituras Firestore WebChannel no navegador; o modo de conexão long polling foi habilitado **somente para Emulator Suite**. A primeira jornada completa do workflow de QA (run `40976263175`) passou e gerou 22 capturas novas com dados sintéticos. A CI `40976263189` aprovou 90 testes unitários, 11 Rules, 5 integrações e audits. Uma única jornada aprovada não encerra o histórico de intermitência: exigir repetições e, no staging autorizado, comparar navegação móvel, autenticação e tracking no ambiente real.
 
## Gate local de estabilidade após repetição

Em 29/10/2026 (horário UTC da execução), o workflow [40991724310](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991724310) aprovou **3 jornadas consecutivas** do navegador com 22 screenshots novas por rodada, totalizando **66** em ambiente **exclusivamente sintético**. O run [40991724298](https://github.com/CristianoRFB/Sorveteria/actions/runs/40991724298) aprovou 101 unitários, 11 Rules e 20 integrações.

Este gate prova apenas a estabilidade local/emulada dentro do escopo desses testes. Para marcar F4 ou F5 como liberadas, executar o mesmo fluxo no staging **real autorizado**, registrar métricas, dispositivos e evidências verificáveis de permissão Alpha/Beta, backup/restauração e rollback. Nunca transformar esse resultado local em declaração automática de prontidão pública.

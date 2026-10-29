# Sorveteria — preflight e liberação de ambientes

**Status:** preparação de F3 e F5, somente leitura. Nenhum ambiente cloud foi provisionado nem homologado por este documento.

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

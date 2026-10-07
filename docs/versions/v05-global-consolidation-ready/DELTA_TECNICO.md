# DELTA_TECNICO — somente o que falta para planos reais

O produto atual possui `TenantFeatureFlags`, mas **não possui sistema comercial de planos/entitlements**.

| Delta | Falta exatamente | Prioridade |
|---|---|---|
| Catálogo de planos | `PlanCatalog` com Essencial/Pro/Premium/Demo e features/limits | NEXT |
| Estado do tenant | `planId`, `subscriptionStatus`, `trialUntil?` | NEXT |
| Entitlements | `resolveEntitlements()`, `canUse()`, overrides | NEXT |
| Limits | `getLimit()`, contagem segura de usuários/entregadores e bloqueio de criação acima do limite | NEXT |
| Separação flag × entitlement | distinguir “tem direito” de “está habilitado/configurado” | NEXT |
| UI feature gating | esconder/desabilitar/explicar recursos não contratados | NEXT |
| Backend validation | validar entitlement em escrita, operação financeira, automação e lógica privilegiada | NEXT |
| Subscription status | `trial / active / past_due / suspended / cancelled / demo` | NEXT |
| Demo mode | `premium_demo` + `subscriptionStatus=demo`, sem hardcode por slug | NEXT |
| Platform Owner plan assignment | atribuição manual de plano/overrides antes de gateway automático | NEXT |
| Landing/pricing real | pricing público + comparação + screenshots reais, apenas quando Essencial existir de ponta a ponta | NEXT |
| Upgrade/downgrade | preservar dados; impedir nova criação acima do limite; leitura quando apropriado | NEXT |
| Testes por plano | tenants Essential/Pro/Premium/Demo; UI/backend/limits/overrides/downgrade/suspensão | NEXT |
| Docs | catálogo canônico, matriz de entitlements, política de downgrade e demo | NEXT |
| Cobrança automática | checkout de assinatura, gateway, webhooks | DEFERRED |
| Add-ons comerciais | custom domain, unidade adicional, integrações pagas | DEFERRED |
| Vertical — gates reais | KDS, caixa/financeiro, cupons, relatórios e advanced delivery precisam existir antes de serem vendidos como diferenciais | NEXT |
| Vertical — Premium real | estoque/CMV, financeiro avançado, dashboards e permissões avançadas precisam existir antes de divulgação como disponíveis | DEFERRED/NEXT conforme estabilidade do core |

## Regra técnica

Condição futura para uma feature configurável:

```text
ENTITLEMENT COMERCIAL
+
CONFIGURAÇÃO DO TENANT
=
FEATURE EFETIVAMENTE DISPONÍVEL
```

Exemplo:

```text
canUse("delivery") && tenantConfig.deliveryEnabled
```

Não modificar Rules agora apenas para simular um entitlement system inexistente.

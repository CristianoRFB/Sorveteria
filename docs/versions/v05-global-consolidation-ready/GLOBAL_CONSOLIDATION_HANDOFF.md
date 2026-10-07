# GLOBAL CONSOLIDATION HANDOFF

## PRODUCT

SaaS Sorveteria

## STATUS

READY_FOR_GLOBAL_CONSOLIDATION

## OPEN_DECISIONS

0

## APPROVED_PRICING

| Plano | Mensal | Anual | Status |
|---|---:|---:|---|
| Essencial | R$ 69,90 | R$ 699/ano | APROVADO |
| Pro | R$ 129,90 | R$ 1.299/ano | APROVADO |
| Premium | R$ 229,90 | R$ 2.299/ano | APROVADO |

Desconto anual aprovado: aproximadamente 2 meses grátis.

## RECOMMENDED_PLAN

**Pro** — plano comercialmente destacado como **RECOMENDADO**.

## APPROVED_PLAN_SUMMARY

- **Essencial:** venda direta e operação básica: storefront/cardápio, personalização, pedido, retirada, delivery simples, tracking e gestão básica.
- **Pro:** tudo do Essencial + KDS/preparo, delivery mais completo, caixa, financeiro operacional, cupons, equipe ampliada e relatórios intermediários.
- **Premium:** tudo do Pro + estoque/CMV, financeiro e relatórios avançados, permissões, automações e branding avançados; recursos ainda não maduros continuam com seu estado técnico original.
- **Add-ons:** custom domain, unidade adicional, integrações externas pagas e migração/customização especial; preços não definidos agora.

## APPROVED_LIMITS

| Limite | Essencial | Pro | Premium |
|---|---:|---:|---:|
| Estabelecimentos | 1 | 1 | 1 |
| Usuários internos ativos | 2 | 5 | 15 |
| Entregadores internos ativos | 1 | 5 | 15 |
| Pedidos | sem limite artificial | sem limite artificial | sem limite artificial |
| Produtos | sem limite artificial | sem limite artificial | sem limite artificial |

Sem limite comercial aprovado agora para armazenamento, histórico ou automações por volume.

## GLOBAL_PATTERN_CANDIDATES

- **PlanCatalog** — CANDIDATO_A_PADRAO_GLOBAL
- **EntitlementService** — CANDIDATO_A_PADRAO_GLOBAL
- **FeatureGating** — CANDIDATO_A_PADRAO_GLOBAL
- **Limits** — CANDIDATO_A_PADRAO_GLOBAL
- **DemoMode** — CANDIDATO_A_PADRAO_GLOBAL
- **SubscriptionStatus** — CANDIDATO_A_PADRAO_GLOBAL
- **TenantOverrides** — CANDIDATO_A_PADRAO_GLOBAL
- **FeatureFlagVsEntitlementSeparation** — CANDIDATO_A_PADRAO_GLOBAL
- **DowngradeDataPreservation** — CANDIDATO_A_PADRAO_GLOBAL
- **SecurityNotPlanDifferentiator** — CANDIDATO_A_PADRAO_GLOBAL

## VERTICAL_ONLY

- modelagem específica de sorveteria: sabores, tamanhos, recipientes, grupos de opções, coberturas e adicionais;
- personalização de potes/casquinhas/milkshakes e produtos equivalentes;
- regras comerciais específicas da vertical Sorveteria;
- distribuição aprovada de delivery simples no Essencial;
- estoque/ficha técnica/CMV como posicionamento Premium desta vertical;
- limites aprovados de entregadores para esta vertical.

## SHARED_WITH_SOME_VERTICALS

- Delivery — compartilhável com outras verticais de alimentação, não global.
- Driver / motoboy — compartilhável com verticais de alimentação que usem entrega.
- Código de confirmação de entrega — compartilhável com verticais que usem delivery.
- KDS / tela de preparo — compartilhável com verticais de alimentação.
- QR Code de cardápio — compartilhável com verticais de alimentação.
- QR por mesa/local — compartilhável com verticais de alimentação em que o fluxo de mesa faça sentido.
- Caixa / financeiro operacional — potencialmente compartilhável com alguns SaaS comerciais, mas não deve ser promovido automaticamente como padrão global.

## NOW

- validar install/build/lint/test existentes;
- validar Firebase real em desenvolvimento;
- concluir autenticação e memberships;
- concluir e testar isolamento Tenant A × Tenant B;
- completar catálogo específico de sorveteria;
- carrinho + checkout;
- criação e gestão de pedidos;
- tracking real;
- delivery/driver + código de entrega real;
- manter landing honesta sobre estágio atual;
- manter pricing aprovado apenas na documentação até o produto estar comercialmente contratável.

## NEXT

- consolidar padrão global antes de implementar PlanCatalog/EntitlementService/SubscriptionStatus/Limits/TenantOverrides/DemoMode;
- depois da consolidação global, implementar a camada de planos/entitlements da vertical;
- atribuição manual de plano pelo Platform Owner;
- premium_demo;
- UI + backend feature gating;
- testes por plano;
- pricing real na landing com screenshots reais;
- KDS;
- caixa/financeiro Pro;
- cupons;
- relatórios intermediários.

## DEFERRED

- gateway de pagamento de assinatura;
- cobrança automática;
- webhooks de cobrança;
- custom domains;
- multi-unidade;
- preço de unidade adicional;
- integrações premium;
- WhatsApp/API paga;
- delivery transversal entre verticais;
- marketplace;
- estoque/CMV avançado antes da estabilização do core;
- automações avançadas ainda não maduras;
- metering sofisticado de armazenamento/uso;
- preço de migrações especiais.

## TECHNICAL_GAPS

- catálogo real de planos;
- estado de assinatura por tenant;
- resolução central de entitlements;
- limites comercialmente aplicáveis;
- separação formal entre entitlement e configuração/feature flag;
- feature gating em UI e backend;
- overrides por tenant;
- demo mode;
- comportamento de upgrade/downgrade;
- testes Essential/Pro/Premium/Demo;
- pricing público apenas após o Essencial funcionar ponta a ponta.

## ACTIVE_DELIVERABLE

- **Tipo:** ZIP + documentação versionada.
- **Pacote ativo anterior:** `SAAS_SORVETERIA_PRICING_DECISIONS_APPROVED_v04.zip`
- **Pacote normalizado atual:** `SAAS_SORVETERIA_GLOBAL_CONSOLIDATION_READY_v05.zip`
- **Documento canônico:** `docs/versions/v05-global-consolidation-ready/GLOBAL_CONSOLIDATION_HANDOFF.md`
- **Fonte de verdade de decisões:** `docs/versions/v05-global-consolidation-ready/DECISIONS_APPROVED.md`

## CODEX_STATUS

READY_FOR_VERTICAL_GOAL_LATER

## GLOBAL_CONSOLIDATION_NOTES

- Preços, anual, nomes dos planos, plano recomendado e limites desta vertical estão aprovados.
- OPEN_DECISIONS desta vertical = 0.
- Pro é o plano comercialmente destacado.
- A demo aprovada simula Premium, mas só pode expor features realmente implementadas e estáveis.
- Segurança, isolamento, autenticação e integridade não diferenciam planos.
- Pedidos e produtos não possuem limite comercial artificial aprovado.
- PlanCatalog, EntitlementService, FeatureGating, Limits, DemoMode, SubscriptionStatus e TenantOverrides são candidatos globais, não padrões definidos.
- Delivery/KDS/QR por mesa pertencem à família de alimentação, não ao Core global automaticamente.
- Nenhum código de entitlements/billing foi implementado nesta etapa.
- Nenhum GOAL para Codex foi gerado; a vertical está pronta para comparação/consolidação global.

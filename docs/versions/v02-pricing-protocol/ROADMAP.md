# ROADMAP — após aplicação do protocolo de pricing

## NOW — não explodir o escopo

Prioridade continua sendo tornar o produto core utilizável e seguro.

1. instalar dependências e validar build/testes atuais;
2. conectar/validar Firebase real em ambiente de desenvolvimento;
3. implementar autenticação e resolução real de memberships;
4. implementar Rules tests Tenant A × Tenant B;
5. completar catálogo específico de sorveteria;
6. carrinho + checkout;
7. criação/gestão de pedido;
8. tracking real;
9. delivery/driver + código de entrega real;
10. corrigir a landing para comunicar corretamente o estágio do produto;
11. manter pricing apenas como **PROPOSTA documentada**.

## NEXT — planos de verdade

Depois que o conjunto core estiver estável:

1. `PlanCatalog`;
2. campos de assinatura do tenant;
3. `EntitlementService`;
4. separar entitlement de feature/config flag;
5. limits service;
6. overrides por tenant;
7. atribuição manual de plano pelo Platform Owner;
8. `premium_demo`;
9. UI gating;
10. backend gating em operações relevantes;
11. testes Essencial / Pro / Premium / Demo;
12. landing com pricing real e screenshots reais;
13. KDS;
14. caixa/financeiro para Pro;
15. cupons;
16. relatórios intermediários.

## DEFERRED

- cobrança automática / gateway / webhooks;
- custom domains;
- multi-unidade;
- integrações premium;
- WhatsApp/API paga;
- estoque/CMV avançado até o core de operação estar validado;
- delivery transversal entre verticais;
- marketplace.

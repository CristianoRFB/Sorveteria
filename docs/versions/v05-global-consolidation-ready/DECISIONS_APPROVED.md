# DECISIONS_APPROVED — SORVETERIA

Status: **APROVADAS PELO USUÁRIO**

## A. PREÇOS

APROVADO:
- Essencial: R$ 69,90/mês;
- Pro: R$ 129,90/mês;
- Premium: R$ 229,90/mês;
- anual: R$ 699 / R$ 1.299 / R$ 2.299;
- desconto anual equivalente a aproximadamente 2 meses grátis;
- sem taxa padrão de implantação inicialmente;
- trial futuro de 14 dias no Pro, sem cartão obrigatório.

## B. PLANOS

APROVADO:
- nomes: Essencial / Pro / Premium;
- Pro destacado como RECOMENDADO;
- Essencial = venda direta + operação básica;
- Pro = operação e gestão do dia a dia;
- Premium = gestão avançada e otimização.

## C. FEATURES

### Essencial
APROVADO:
- storefront white-label básico;
- branding básico;
- cardápio;
- categorias/produtos;
- personalização específica de sorveteria;
- QR de cardápio;
- carrinho;
- checkout;
- pedido web;
- retirada;
- delivery simples;
- tracking;
- código de entrega;
- painel básico;
- gestão de pedidos;
- resumo básico de vendas.

### Pro
APROVADO:
- tudo do Essencial;
- KDS/preparo;
- gestão mais completa de entregadores;
- zonas/taxas de entrega;
- QR por mesa/local;
- caixa;
- financeiro operacional;
- cupons/promoções;
- equipe ampliada;
- relatórios intermediários.

### Premium
APROVADO COMO POSICIONAMENTO:
- tudo do Pro;
- estoque;
- ficha técnica/CMV;
- financeiro avançado;
- dashboards/relatórios avançados;
- permissões avançadas;
- automações avançadas;
- branding avançado;
- suporte prioritário.

OBSERVAÇÃO:
Estoque/CMV e outras features Premium ainda não maduras continuam DEFERRED tecnicamente até o core estabilizar. Aprovação comercial não significa implementação existente.

### Add-ons
APROVADO COMO CATEGORIA FUTURA:
- custom domain;
- unidade adicional;
- integrações pagas;
- migração/customização especial.

### Nunca diferenciar por plano
APROVADO:
- autenticação segura;
- isolamento multi-tenant;
- integridade financeira;
- Security Rules;
- proteção de dados;
- confiabilidade básica;
- correções de segurança.

## D. LIMITES

APROVADO:
- usuários internos: 2 / 5 / 15;
- entregadores: 1 / 5 / 15;
- estabelecimentos: 1 / 1 / 1;
- pedidos: sem limite artificial;
- produtos: sem limite artificial;
- armazenamento: sem limite comercial por enquanto;
- histórico: sem limite comercial por enquanto;
- automações: diferenciar por capacidade, não por contagem, até existir motor real.

## E. DEMO

APROVADO:
- demo simula Premium;
- status futuro: `premium_demo` / `subscriptionStatus=demo`;
- liberar somente funcionalidades realmente implementadas e estáveis;
- identificação explícita: “Ambiente de demonstração — dados fictícios. Nenhuma operação real será realizada.”;
- não hardcodar tenant específico como demo.

`DemoMode` continua **CANDIDATO_A_PADRAO_GLOBAL**.

## F. LANDING / PRICING

APROVADO:
- destacar Pro;
- mostrar apenas diferenças de alto impacto;
- não listar Firebase, Firestore, Security Rules, tenant isolation, índices ou detalhes internos;
- pricing contratável só quando o Essencial funcionar ponta a ponta.

## G. DECISÕES TÉCNICAS

Aprovadas como direção da vertical, mas **pendentes de consolidação como padrão global**:

- separar Feature Flag de Entitlement;
- `PlanCatalog`;
- `EntitlementService`;
- `SubscriptionStatus`;
- serviço de `limits`;
- overrides por tenant;
- gating frontend + backend;
- downgrade preservando dados.

Todos marcados como:

**CANDIDATO_A_PADRAO_GLOBAL**

A aprovação desta vertical NÃO define automaticamente a implementação global do ecossistema.

## NÃO FAZER AGORA

Permanece DEFERRED:
- gateway de cobrança;
- checkout de assinatura;
- webhooks de cobrança;
- cobrança automática;
- preços/implementação de custom domain;
- multi-unidade;
- preço de unidade adicional;
- WhatsApp/API paga;
- integrações premium;
- marketplace;
- delivery compartilhado entre verticais;
- estoque/CMV antes de estabilizar o core;
- automações avançadas não definidas;
- metering sofisticado;
- preço de migrações especiais;
- implementação de PlanCatalog/EntitlementService/DemoMode/SubscriptionStatus/limits/overrides antes da consolidação global.

# PRICING AND PLANS — proposta da vertical Sorveteria

Status: **PROPOSTA / EM TESTE**  
Data: 2026-10-06

Nada neste documento deve ser interpretado como preço já aprovado, publicado ou contratado.

## Proposta inicial

| Plano | Mensal proposto | Anual proposto | Público | Posicionamento |
|---|---:|---:|---|---|
| **Essencial** | **R$ 69,90/mês** | **R$ 699/ano** | sorveteria pequena começando a vender direto | entrada funcional, sem plano “capado” |
| **Pro** | **R$ 129,90/mês** | **R$ 1.299/ano** | maioria das operações locais | **RECOMENDADO** — operação + gestão |
| **Premium** | **R$ 229,90/mês** | **R$ 2.299/ano** | operação mais madura/complexa | máximo valor e recursos avançados |

O anual equivale a aproximadamente **2 meses grátis** em relação à mensalidade cheia.

## Regras comerciais propostas

- Pedidos diretos: **sem comissão por pedido da plataforma** na proposta atual.
- Segurança, isolamento multi-tenant, autenticação segura, correções e integridade **não variam por plano**.
- Cobrança automática não é requisito para começar: o Platform Owner pode atribuir o plano manualmente quando o entitlement system existir.
- Recursos que gerem custo de terceiros podem virar add-on ou repasse transparente.

## Plano Essencial — CORE

Objetivo: resolver de verdade a venda direta e operação básica.

### Entitlements pretendidos

- storefront white-label básico;
- cardápio online;
- categorias/produtos;
- personalização própria de sorveteria;
- QR Code do cardápio;
- pedido web;
- retirada;
- delivery simples quando configurado;
- acompanhamento por código;
- confirmação segura de entrega quando delivery estiver ativo;
- painel de pedidos básico;
- relatório/resumo básico de vendas;
- branding básico;
- suporte padrão.

### Limites propostos

- 1 tenant / 1 estabelecimento;
- até 2 usuários internos ativos;
- até 1 entregador interno ativo;
- pedidos: **sem limite artificial inicial**;
- produtos: sem limite comercial inicial, sujeito a limites técnicos razoáveis;
- histórico operacional preservado.

## Plano Pro — GROWTH — RECOMENDADO

Tudo do Essencial, mais:

- KDS / tela de preparo;
- gestão mais completa de entregadores;
- zonas/taxas de entrega mais flexíveis;
- caixa completo;
- visão financeira operacional;
- cupons/promoções;
- histórico e filtros operacionais mais ricos;
- QR por mesa/local quando o tenant realmente usa esse fluxo;
- equipe e permissões operacionais mais completas;
- relatórios intermediários;
- branding ampliado.

### Limites propostos

- 1 estabelecimento;
- até 5 usuários internos ativos;
- até 5 entregadores internos ativos;
- pedidos sem limite comercial inicial.

## Plano Premium — ADVANCED

Tudo do Pro, mais, **quando efetivamente implementado**:

- estoque;
- ficha técnica/CMV quando modelada para sorveteria;
- financeiro avançado;
- relatórios avançados;
- dashboards executivos;
- permissões mais granulares;
- automações avançadas;
- recursos avançados de branding;
- prioridade de suporte;
- limites maiores de equipe.

### Limites propostos

- 1 estabelecimento no modelo atual;
- até 15 usuários internos ativos;
- até 15 entregadores internos ativos;
- pedidos sem limite comercial inicial.

## Add-ons propostos — não aprovados

| Add-on | Status | Proposta |
|---|---|---|
| Migração/cadastro assistido de catálogo | PROPOSTA | preço único sob complexidade; faixa inicial R$ 149–499 |
| Unidade adicional | DEFERRED | somente após arquitetura multi-unidade real |
| Domínio personalizado | DEFERRED | somente quando custom domains estiverem implementados |
| WhatsApp/API oficial paga | DEFERRED | repasse de custo + serviço, sem hardcode por cliente |
| Integração especial | DEFERRED | orçamento específico |

## Implantação / trial / demo

### Implantação

Proposta de lançamento:

- setup padrão por configuração: sem taxa obrigatória;
- migração/importação manual complexa: add-on;
- nenhum valor é considerado validado ainda.

### Demo

A demo comercial deve usar:

```text
plan = premium_demo
subscriptionStatus = demo
```

Mas deve liberar **somente capacidades realmente implementadas**. Não simular feature inexistente como funcional.

### Trial

Automação de trial é `NEXT`.

Enquanto não existir entitlement/subscription engine, a validação comercial pode usar tenant demo controlado manualmente pelo Platform Owner.

## Matriz estratégica de features

Legenda de estado refere-se ao runtime atual; a coluna de plano refere-se ao destino comercial quando a feature existir de verdade.

| Feature | Estado atual | Essencial | Pro | Premium | Add-on | Classe |
|---|---|---:|---:|---:|---:|---|
| Multi-tenancy / isolamento | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | obrigação de plataforma |
| Auth segura / RBAC | PLANEJADA/EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | obrigação de plataforma |
| White-label básico | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | CORE |
| Cardápio online | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | CORE |
| Produtos/personalizações | PLANEJADA | ✅ | ✅ | ✅ | ❌ | CORE |
| QR do cardápio | IMPLEMENTADA | ✅ | ✅ | ✅ | ❌ | CORE |
| Carrinho/checkout | PLANEJADA | ✅ | ✅ | ✅ | ❌ | CORE |
| Pedido web | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | CORE |
| Retirada | EM_IMPLEMENTACAO/PLANEJADA | ✅ | ✅ | ✅ | ❌ | CORE |
| Delivery simples | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | CORE |
| Tracking | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | CORE |
| Código seguro de entrega | EM_IMPLEMENTACAO | ✅ | ✅ | ✅ | ❌ | integridade do fluxo |
| Painel de pedidos | PLANEJADA | ✅ | ✅ | ✅ | ❌ | CORE |
| KDS | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| Delivery/driver avançado | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| Caixa | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| Financeiro operacional | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| Cupons | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| QR mesa/local | EM_IMPLEMENTACAO | ❌ | ✅ | ✅ | ❌ | GROWTH opcional |
| Relatórios intermediários | PLANEJADA | ❌ | ✅ | ✅ | ❌ | GROWTH |
| Estoque | PLANEJADA | ❌ | ❌ | ✅ | ❌ | ADVANCED |
| CMV/ficha técnica | PLANEJADA | ❌ | ❌ | ✅ | ❌ | ADVANCED |
| Financeiro avançado | PLANEJADA | ❌ | ❌ | ✅ | ❌ | ADVANCED |
| Relatórios avançados | PLANEJADA | ❌ | ❌ | ✅ | ❌ | ADVANCED |
| Permissões avançadas | PLANEJADA | ❌ | ❌ | ✅ | ❌ | ADVANCED |
| Custom domain | DEFERRED | ❌ | ❌ | ❌ | ✅ | ADD-ON futuro |
| Unidade adicional | DEFERRED | ❌ | ❌ | ❌ | ✅ | ADD-ON futuro |
| Platform Owner | EM_IMPLEMENTACAO | — | — | — | — | PLATFORM_INTERNAL |
| Audit log interno | EM_IMPLEMENTACAO | — | — | — | — | PLATFORM_INTERNAL |

## Regra de downgrade futura

Não apagar dados ao reduzir plano.

Preferir:

1. preservar dados existentes;
2. impedir novas criações acima do limite;
3. manter leitura quando apropriado;
4. mostrar o limite e CTA de upgrade;
5. bloquear execução de operações premium no backend, não apenas na UI.

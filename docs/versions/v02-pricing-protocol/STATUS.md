# STATUS — v02 Pricing Protocol

## Estado geral

`FOUNDATION / NÃO PRODUCTION-READY / PRICING PROPOSTO`

## Estado comercial

- Pricing: `PROPOSTA / EM TESTE`
- Entitlements: `NÃO IMPLEMENTADOS`
- Billing: `NÃO IMPLEMENTADO`
- Trial automático: `NÃO IMPLEMENTADO`
- Demo premium real: `NÃO IMPLEMENTADA`
- Landing com contratação: `NÃO IMPLEMENTADA`

## O que realmente existe no runtime

- React/Vite/TypeScript;
- Firebase bootstrap;
- tenant resolver;
- TenantContext;
- roles e helpers;
- feature flags diretas por tenant;
- white-label parcial;
- QR de cardápio local;
- shells de landing, storefront, menu, tracking, tenant admin, platform admin;
- modelos iniciais de pedido/delivery/audit;
- Firestore/Storage Rules iniciais;
- testes unitários iniciais presentes no ZIP.

## O que ainda não deve ser vendido como implementado

- fluxo completo de compra;
- painel operacional de pedidos;
- KDS;
- portal driver;
- código de entrega funcional ponta a ponta;
- caixa;
- financeiro;
- estoque;
- relatórios completos;
- sistema de planos;
- subscription state;
- entitlement enforcement;
- cobrança automática.

## Decisão de escopo desta versão

Aplicar o protocolo no nível de auditoria, arquitetura comercial e documentação, preservando o runtime existente. Não inserir feature gating incompleto apenas para aparentar suporte a planos.

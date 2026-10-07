# PRICING REFACTOR — o que foi alterado nesta versão

## Artefato ativo identificado

O GitHub `CristianoRFB/Sorveteria` estava vazio na sincronização anterior. O artefato ativo desta etapa é o ZIP foundation `SAAS_SORVETERIA_CORE_SYNC_v01.zip`.

Portanto, esta aplicação do protocolo refatora o ZIP e sua documentação, sem fingir que o repo ou o runtime já possuem billing/entitlements.

## Alterações realizadas

- auditoria funcional real do ZIP;
- inventário de features com estados canônicos;
- pesquisa de referência de preços da vertical;
- proposta comercial Sorveteria;
- matriz de features por plano;
- matriz de limites;
- arquitetura futura de entitlements;
- regra de overrides;
- estratégia de downgrade;
- estratégia de demo;
- estratégia da landing;
- roadmap NOW/NEXT/DEFERRED;
- nova versão canônica `v02-pricing-protocol`;
- cópia do protocolo global em `docs/reference/`;
- correção de copy da landing para não vender módulos planejados como implementados.

## Não implementado de propósito

- `PlanCatalog` em código;
- `EntitlementService`;
- `planId` no tenant runtime;
- subscription state real;
- trial engine;
- gateway de cobrança;
- feature gate de backend;
- tela de pricing para contratação;
- upgrade/downgrade runtime;
- testes por plano.

Esses itens estão classificados no roadmap.

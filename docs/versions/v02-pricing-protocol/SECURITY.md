# SECURITY — pricing e isolamento

## Segurança existente na foundation

- Firestore Rules deny-by-default no fallback;
- regras tenant-aware iniciais;
- Storage path tenant-scoped;
- Platform Owner previsto via claim;
- driver e customer possuem escopo conceitual limitado.

A eficácia real ainda depende de testes no Emulator e integração completa de Auth/memberships.

## Regra de planos

Segurança básica nunca é entitlement premium.

Não limitar por plano:

- isolamento de tenant;
- autenticação segura;
- integridade;
- correções de segurança;
- ownership;
- autorização mínima;
- proteção de dados.

## Feature gating futuro

Ocultar botão não é autorização.

Quando uma feature de plano executar operação protegida, o lado confiável deverá validar o entitlement efetivo.

A arquitetura precisa impedir:

- Essencial chamando operação Premium diretamente;
- alteração de `planId` pelo cliente;
- override concedido pelo próprio tenant sem autorização;
- bypass alterando payload/rota;
- cross-tenant via entitlement.

## Estado desta versão

Nenhum gating por plano foi adicionado às Rules nesta refatoração porque o modelo de subscription/entitlement ainda não existe. Fazer um `if` parcial agora criaria falsa segurança.

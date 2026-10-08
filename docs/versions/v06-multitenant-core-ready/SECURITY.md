# Segurança e autorização

## Identidade e RBAC

- Firebase Auth fornece UID e token verificado. Claim `platform_owner` é atribuído no servidor; não é aceito do estado arbitrário da UI.
- Membership usa `memberships/{tenantId}_{uid}` e precisa pertencer ao tenant, ao UID autenticado e estar ativa.
- As roles existentes dirigem guards e backend. `/admin` requer Platform Owner. Painel tenant requer membership autorizada; tela de driver exige role driver.

## Firestore

`firestore.rules` é deny-by-default. Leitura pública limita-se a tenants ativos, catálogo ativo/disponível, settings públicas e projeção de tracking. Mutações de pedidos, memberships, status, deliveries, auditoria e dados operacionais são negadas pelo SDK cliente e executadas por Functions com validação de auth, membership, tenant e transições.

## Isolamento

Alpha e beta têm memberships e dados independentes. Reads por pedido são condicionados a role ou customerId; driver lê somente delivery atribuída ao seu UID. Tenant suspenso deixa de fornecer o fluxo público conforme status e regras. Um slug não ativo não cai em outro tenant.

## Functions

Callable Functions verificam auth e permissões a cada operação. `createOrder` recalcula valores e ignora preço/total enviado como autoritativo. Atualizações de status aplicam state machine. Ações de entrega validam vínculo e estado; códigos são vinculados ao tenant/pedido, com falhas limitadas e uso único. Reset requer role permitida, justificativa e audit.

## Storage

`storage.rules` separa `tenants/{id}/public/**` e `private/**`. Assets públicos exigem tenant ativo; upload exige role administrativa e tipo/tamanho aceitos. Área privada exige membership ou Platform Owner. Demais caminhos são negados.

## Validação

`npm run test:rules` executou 9 casos de Firestore/Storage; `npm run test:integration` exercitou claims, escopo, função de pedido e entrega. Consulte a tabela detalhada no [STATUS](STATUS.md).

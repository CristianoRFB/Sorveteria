# Modelo de dados

Todos os documentos de operação pertencem a `tenants/{tenantId}`. Identificadores e campos de autorização são derivados no servidor; o cliente não define campos confiáveis.

| Caminho | Uso / campos principais | Escrita |
|---|---|---|
| `users/{uid}` | perfil mínimo de usuário | próprio usuário edita campos de perfil permitidos; backend administra seed |
| `memberships/{tenantId}_{uid}` | `tenantId`, `userId`, `role`, `status` | callable Functions |
| `tenants/{tenantId}` | slug, status, branding, contato, flags operacionais | callable Functions |
| `tenantSlugs/{slug}` | índice slug → tenantId | callable Functions; leitura pública bloqueada |
| `tenants/{id}/settings/main` | taxa, estimativa e métodos de pagamento | tenant manager via callable |
| `tenants/{id}/categories/{categoryId}` | nome, disponibilidade e ordenação | tenant manager via callable |
| `tenants/{id}/products/{productId}` | tipo, preço em centavos, opções, disponibilidade | tenant manager via callable |
| `tenants/{id}/orders/{orderId}` | publicCode, customerId, itens snapshot, valores, endereço, fulfillment, status/timestamps | backend; Rules negam writes cliente |
| `tenants/{id}/publicOrderTracking/{publicCode}` | projeção pública mínima de acompanhamento | backend; `get` público por código; list/write negados |
| `tenants/{id}/deliveries/{orderId}` | driverId, estado e tentativas | callable Functions |
| `tenants/{id}/auditLogs/{auditId}` | ator, ação, alvo, horário, metadados mínimos e motivo | backend append-only |

## Pedido e valores

O navegador envia seleção de opções e dados necessários ao checkout, mas a Function lê o catálogo e as configurações atuais e recalcula os preços. O pedido guarda snapshot das escolhas e valores usados. `publicCode` serve para acompanhamento, não para autorização administrativa.

## Entrega

Delivery confirmation code é distinto do publicCode; a Function grava somente hash derivado com tenantId e orderId. Erros são limitados, e o código é consumido na entrega. Reset é ação administrativa com motivo e audit.

## Identidade comercial

Nenhum `planId`, subscription status ou entitlement é autoritativo neste modelo. A decisão comercial aprovada permanece apenas documental nesta etapa.

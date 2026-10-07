# DATA MODEL — atual e delta futuro de pricing

## Coleções atuais/conceituais da foundation

```text
users/{uid}
memberships/{tenantId}_{uid}
tenants/{tenantId}
  categories/{categoryId}
  products/{productId}
  tables/{tableId}
  orders/{orderId}
  publicOrderTracking/{publicCode}
  deliveries/{deliveryId}
  cashSessions/{sessionId}
  financialTransactions/{transactionId}
  auditLogs/{auditId}
```

## Pricing — não implementado no runtime atual

Alvo futuro:

```text
plans/{planId}
  name
  status
  features{}
  limits{}

tenants/{tenantId}
  planId
  subscriptionStatus
  trialUntil?
  entitlementOverrides?
  limitOverrides?
```

Possíveis status:

```text
trial | active | past_due | suspended | cancelled | demo
```

Nenhum desses campos é considerado implementado apenas por estar documentado aqui.

## Downgrade

Dados não devem ser apagados automaticamente ao reduzir plano. O runtime futuro deverá preservar dados e bloquear novas operações que excedam limite quando apropriado.

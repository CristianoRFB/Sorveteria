# DATA MODEL

Coleções conceituais:

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

## QR / mesa

`tableOrdering` é opcional.

Um pedido pode registrar:

```ts
source: {
  channel: "web" | "qr",
  qrCodeId?: string,
  tableId?: string
}
```

Assim o suporte vertical existe sem obrigar todas as sorveterias a operar com mesas.

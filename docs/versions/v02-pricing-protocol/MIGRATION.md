# MIGRATION / ROLLBACK

## v01 → v02

Esta versão é principalmente documental/comercial.

Não há migração de Firestore necessária porque subscription/entitlement ainda não foi implementado.

Alterações de runtime desta versão limitam-se à copy da landing para refletir honestamente o estágio da foundation.

Rollback:

- restaurar a landing anterior;
- apontar `docs/CURRENT.md` novamente para `v01-core-sync`.

## Migração futura para planos

Quando chegar a fase NEXT:

1. criar catálogo de planos;
2. adicionar campos de subscription de forma backwards-compatible;
3. definir plano default/manual para tenants existentes;
4. só então ligar feature gates;
5. testar downgrade e overrides antes de produção.

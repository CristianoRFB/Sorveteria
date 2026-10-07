# SECURITY

## Regras centrais

- deny by default;
- Platform Owner via claim confiável;
- Tenant Owner isolado por membership;
- Customer não possui acesso administrativo;
- Driver acessa somente entregas autorizadas;
- tenantId não é autorização por si só;
- uploads são tenant-scoped;
- ações cross-tenant do Platform Owner precisam de auditoria;
- tenant suspenso deve perder operação pública sem apagar histórico.

## P0 para próxima rodada
- implementar suíte real de Rules no Emulator;
- validar customer/driver ownership;
- mover cálculos financeiros/validação de preço crítica para camada confiável antes de produção;
- implementar gravação de AuditLog por backend confiável para ações críticas.

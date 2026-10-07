# GLOBAL_CONSOLIDATION_HANDOFF

Este documento leva para a consolidação global somente decisões com potencial de padronização entre SaaS.

## CANDIDATO_A_PADRAO_GLOBAL

1. **PlanCatalog**
   - catálogo canônico de planos;
   - evitar regras de plano espalhadas.

2. **EntitlementService**
   - resolução única de `canUse()`/capabilities.

3. **Feature Flag ≠ Entitlement**
   - entitlement responde se o tenant tem direito;
   - feature/config flag responde se o recurso está habilitado/configurado.

4. **SubscriptionStatus**
   - estados mínimos sugeridos pela vertical:
     `trial`, `active`, `past_due`, `suspended`, `cancelled`, `demo`.

5. **Limits**
   - serviço centralizado para `getLimit()` e validação de limites.

6. **Tenant Overrides**
   - exceções comerciais auditáveis sem fork/hardcode.

7. **DemoMode**
   - demo como estado/plano próprio, não como slug hardcoded;
   - demonstração pode liberar capacidades premium desde que implementadas.

8. **Feature Gating**
   - UI check + backend/server check quando a operação tiver efeito protegido.

9. **Downgrade**
   - preservar dados;
   - impedir novas criações acima do limite quando necessário;
   - evitar deleção automática.

10. **Segurança não é feature de plano**
    - isolamento, autenticação segura, integridade e correções são obrigação de todos os planos.

## NÃO DEFINIDO GLOBALMENTE AQUI

Este arquivo NÃO decide:
- nomes globais dos planos;
- preços globais;
- limites globais;
- implementação comum;
- gateway;
- billing;
- estrutura de banco definitiva do ecossistema.

A vertical Sorveteria apenas registra sua direção aprovada para comparação posterior.

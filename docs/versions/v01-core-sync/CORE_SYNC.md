# CORE SYNC — comparação com SaaS Project Core v01

## Já existia no estado atual
- Multi-Tenant White-Label.
- Platform Admin global / Tenant Owner.
- memberships e RBAC.
- tenant resolver.
- Firebase Security Rules como requisito.
- audit logs como requisito.
- feature flags.
- onboarding / ajuda.
- cardápio online.
- retirada.
- delivery.
- driver.
- Firebase + Cloudflare.
- não transformar o ecossistema em uma base monolítica.
- não criar marketplace agora.

## Faltava ou não estava explícito; aplicado
- documentação versionada + `docs/CURRENT.md`;
- marcadores de standard;
- suspensão de tenant sem exclusão;
- landing comercial global do SaaS;
- compartilhamento de deploy dentro da vertical documentado;
- evidência por screenshots reais (processo/diretório, sem fake);
- segundo tenant de teste como critério formal;
- QR Code próprio;
- suporte opcional a mesa/local via QR;
- origem do pedido (`web` / `qr`);
- alias conceitual `platform_owner` com label Platform Admin.

## Avaliado e não implementado agora
- marketplace;
- delivery transversal;
- mesa obrigatória;
- custom domains;
- migração de cliente legado;
- integrações não necessárias.

Regra aplicada: registrar cedo, implementar na hora certa.

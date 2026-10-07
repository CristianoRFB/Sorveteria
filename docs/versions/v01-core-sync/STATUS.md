# STATUS

## Estado
FOUNDATION / NÃO PRODUCTION-READY

## Já preservado do estado atual
- SaaS Sorveteria separado de Açaí/Sushi/Food.
- Multi-Tenant + White-Label.
- Platform Admin global.
- Tenant Owner isolado.
- Customer comprador.
- Driver operacional.
- Firebase + Cloudflare.
- tenant resolution.
- memberships/RBAC.
- delivery, pickup, tracking e código de entrega.
- caixa/financeiro como módulos do tenant.
- feature flags.
- onboarding/ajuda como padrão de UX.

## Mudanças do Core aplicadas nesta sincronização
### GLOBAL
- documentação versionada com `docs/CURRENT.md`;
- marcadores explícitos GLOBAL / VERTICAL / PRODUCT;
- tenant suspenso sem exclusão automática;
- landing comercial da plataforma separada da storefront de tenant;
- audit log como contrato explícito;
- diretório de screenshots reais como evidência, sem gerar imagem falsa;
- deploy compartilhado documentado dentro da vertical;
- segundo tenant de teste documentado;
- papéis alinhados ao conceito `platform_owner` com label “Platform Admin”.

### VERTICAL — ALIMENTAÇÃO
- QR Code próprio gerado localmente;
- QR genérico do cardápio;
- suporte opcional a QR de mesa/local;
- `tableOrdering` atrás de feature flag (default false);
- origem do pedido preparada para `web` ou `qr`, com `tableId` opcional;
- cardápio online e delivery mantidos como módulos centrais.

## Não aplicado de propósito
- marketplace: continua futuro/deferred;
- delivery transversal entre verticais: não implementado agora;
- mesa obrigatória: não faz sentido impor a toda sorveteria;
- migração de cliente legado: produto/repositório atual é novo;
- screenshots “reais” falsos: não foram fabricados.


Consulte `CURRENT_STATE.md` para o estado observado do repositório antes desta sincronização.

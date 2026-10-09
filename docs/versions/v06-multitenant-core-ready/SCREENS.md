# Telas e evidências visuais

As evidências abaixo são capturas reais da aplicação em execução local, usando Firebase Auth, Firestore e Functions Emulators com fixtures `tenant-alpha` e `tenant-beta`. As imagens conceituais ficam exclusivamente em `generated/` e são catalogadas em [GENERATED_VISUALS.md](GENERATED_VISUALS.md).

## Capturas reais

| Tela / jornada | Evidência |
|---|---|
| Landing SaaS | [landing-saas.png](screenshots/landing-saas.png) |
| Login e autenticação do tenant | [login-tenant.png](screenshots/login-tenant.png) |
| Storefront Alpha desktop | [tenant-alpha-storefront-desktop.png](screenshots/tenant-alpha-storefront-desktop.png) |
| Storefront Alpha mobile | [tenant-alpha-storefront-mobile.png](screenshots/tenant-alpha-storefront-mobile.png) |
| Cardápio e produtos | [tenant-alpha-cardapio.png](screenshots/tenant-alpha-cardapio.png) |
| Personalização de produto | [personalizacao-produto.png](screenshots/personalizacao-produto.png) |
| Carrinho | [carrinho.png](screenshots/carrinho.png) |
| Checkout: entrega, dados, pagamento e revisão | [checkout.png](screenshots/checkout.png) |
| Confirmação do pedido e códigos | [confirmacao-pedido.png](screenshots/confirmacao-pedido.png) |
| Tracking público | [tracking-pedido.png](screenshots/tracking-pedido.png) |
| Owner Alpha: pedidos e operações | [tenant-owner-pedidos.png](screenshots/tenant-owner-pedidos.png) |
| Owner Alpha: catálogo | [tenant-owner-catalogo.png](screenshots/tenant-owner-catalogo.png) |
| Driver: entrega atribuída | [driver-entrega-atribuida.png](screenshots/driver-entrega-atribuida.png) |
| Driver: chegada e código | [driver-chegada.png](screenshots/driver-chegada.png) |
| Driver: entrega concluída | [driver-entrega-concluida.png](screenshots/driver-entrega-concluida.png) |
| Driver Alpha tentando abrir entregas Beta | [driver-alpha-sem-acesso-a-beta.png](screenshots/driver-alpha-sem-acesso-a-beta.png) |
| Platform Owner: tenants ativos | [platform-owner.png](screenshots/platform-owner.png) |
| Platform Owner: contexto Alpha e retorno à plataforma | [platform-owner-contexto-alpha.png](screenshots/platform-owner-contexto-alpha.png) |
| Platform Owner: contexto Beta e troca de contexto | [platform-owner-contexto-beta.png](screenshots/platform-owner-contexto-beta.png) |
| Platform Owner: tenant suspenso | [platform-owner-tenant-suspenso.png](screenshots/platform-owner-tenant-suspenso.png) |
| Platform Owner: tenant reativado | [platform-owner-tenant-reativado.png](screenshots/platform-owner-tenant-reativado.png) |
| Owner Beta tentando abrir o painel Alpha | [tenant-beta-sem-acesso-a-alpha.png](screenshots/tenant-beta-sem-acesso-a-alpha.png) |

## QA visual

Em 09/10/2026, a jornada completa no Emulator Suite percorreu cliente → pedido → tracking; Owner Alpha → status e catálogo; Driver Alpha → saída, chegada e confirmação; Owner Beta → bloqueio ao painel Alpha; e Platform Owner → entrada em Alpha, retorno à plataforma, troca para Beta, suspensão e reativação. Essa execução salvou 21 capturas. Em verificações direcionadas posteriores, a conta Driver Alpha tentou abrir as entregas Beta e recebeu a negação de acesso; o fluxo de status do Owner também foi revalidado após ajuste da atualização visual. Os arquivos resultantes totalizam 22 capturas catalogadas. Repetições posteriores da jornada completa tiveram timeout intermitente no tracking e não são contabilizadas como execuções completas aprovadas.

As capturas foram inspecionadas visualmente; checkout, storefront mobile, Platform Owner e a negação entre tenants foram verificados em detalhe. Nenhuma imagem gerada foi usada como prova de funcionalidade.

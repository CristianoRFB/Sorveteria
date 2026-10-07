# FEATURE_MATRIX — Executivo/Técnico

Fonte: auditoria vigente `v02-pricing-protocol`.  
Esta matriz reorganiza a auditoria; **não altera o estado de implementação**.

| Funcionalidade | Estado real | Plano mínimo / classe | Limite proposto | Nota |
|---|---|---|---|---|
| Base web React + TypeScript + Vite | IMPLEMENTADA | Interna | — | Fundação técnica; não é argumento de plano. |
| Bootstrap Firebase Auth/Firestore/Storage | IMPLEMENTADA | Interna | — | Conexão real ainda não validada. |
| Cloudflare SPA/deploy | EM IMPLEMENTAÇÃO | Interna | — | Config existe; deploy não confirmado. |
| Tenant resolver por slug | IMPLEMENTADA | Interna | — | Base multi-tenant. |
| Isolamento Tenant A × Tenant B | EM IMPLEMENTAÇÃO | Interna | — | Rules existem; testes reais ainda faltam. |
| RBAC/helpers locais | IMPLEMENTADA | Interna | — | Fundação de autorização. |
| Login/logout + membership resolution | PLANEJADA | Interna | — | Necessário antes de comercialização real. |
| Firestore Rules tenant-aware | EM IMPLEMENTAÇÃO | Interna | — | Segurança não varia por plano. |
| Storage Rules tenant-aware | EM IMPLEMENTAÇÃO | Interna | — | Segurança não varia por plano. |
| Platform Owner global | EM IMPLEMENTAÇÃO | Interna | — | Ferramenta da plataforma. |
| Audit log confiável | EM IMPLEMENTAÇÃO | Interna | — | Persistência completa ainda falta. |
| Feature flags por tenant | IMPLEMENTADA | Interna | — | Configuração operacional; não é entitlement comercial. |
| Landing comercial do SaaS | EM IMPLEMENTAÇÃO | Interna | — | Hoje é foundation; pricing real fica para NEXT. |
| Storefront white-label básico | EM IMPLEMENTAÇÃO | Essencial | 1 estabelecimento | Base comercial do tenant. |
| Branding básico | EM IMPLEMENTAÇÃO | Essencial | 1 identidade/tenant | Cores básicas já aplicadas; editor completo falta. |
| Branding avançado | PLANEJADA | Premium | — | Customizações adicionais futuras. |
| Cardápio online | EM IMPLEMENTAÇÃO | Essencial | Sem limite comercial inicial | Rota existe; consulta real de produtos falta. |
| Categorias e produtos | EM IMPLEMENTAÇÃO | Essencial | Sem limite comercial inicial | Banco/modelo parcial; UI/repository faltam. |
| Sabores/tamanhos/recipientes/grupos de opções | PLANEJADA | Essencial | — | Core específico de sorveteria. |
| QR Code do cardápio | IMPLEMENTADA | Essencial | — | Geração local existente. |
| QR por mesa/local | EM IMPLEMENTAÇÃO | Pro | — | Growth opcional; fluxo completo não existe. |
| Carrinho | PLANEJADA | Essencial | — | Core. |
| Checkout entrega/retirada/pagamento/revisão | PLANEJADA | Essencial | — | Core. |
| Pedido web / state model | EM IMPLEMENTAÇÃO | Essencial | Pedidos sem limite artificial inicial | Modelo/Rules existem; service/UI faltam. |
| Retirada | EM IMPLEMENTAÇÃO | Essencial | — | Parte do core comercial. |
| Delivery simples | EM IMPLEMENTAÇÃO | Essencial | 1 entregador ativo proposto | Core da vertical quando configurado. |
| Tracking por código | EM IMPLEMENTAÇÃO | Essencial | — | UI existe; consulta real falta. |
| Código seguro de entrega | EM IMPLEMENTAÇÃO | Essencial | — | Integridade do fluxo; não é luxo de plano. |
| Painel tenant básico | EM IMPLEMENTAÇÃO | Essencial | Até 2 usuários internos | Shell existe; módulos funcionais faltam. |
| Gestão de pedidos | PLANEJADA | Essencial | — | Core operacional. |
| Resumo básico de vendas | PLANEJADA | Essencial | — | Versão simples planejada. |
| KDS / tela de preparo | PLANEJADA | Pro | — | Growth. |
| Gestão avançada de entregadores | PLANEJADA | Pro | Até 5 entregadores ativos | Growth. |
| Zonas/taxas de entrega flexíveis | PLANEJADA | Pro | — | Growth. |
| Caixa completo | PLANEJADA | Pro | — | Abertura, sangria, suprimento, fechamento. |
| Financeiro operacional | PLANEJADA | Pro | — | Visão operacional; não contábil completa. |
| Cupons/promoções | PLANEJADA | Pro | — | Growth. |
| Equipe/permissões operacionais ampliadas | PLANEJADA | Pro | Até 5 usuários internos | Gestão mais completa. |
| Relatórios intermediários | PLANEJADA | Pro | — | Filtros e histórico mais ricos. |
| Estoque | PLANEJADA | Premium | — | Advanced; fora do NOW. |
| Ficha técnica / CMV | PLANEJADA | Premium | — | Advanced; depende do core. |
| Financeiro avançado | PLANEJADA | Premium | — | Advanced. |
| Relatórios avançados / dashboards executivos | PLANEJADA | Premium | — | Advanced. |
| Permissões avançadas | PLANEJADA | Premium | Até 15 usuários internos | Advanced. |
| Automações avançadas | PLANEJADA | Premium | — | Advanced. |
| Suporte prioritário | PLANEJADA | Premium | — | Decisão comercial futura. |
| Custom domain | DEFERRED | Add-on | Por domínio | Futuro. |
| Unidade adicional | DEFERRED | Add-on | Por unidade | Multi-unidade não faz parte do modelo atual. |
| WhatsApp/API paga e integrações premium | DEFERRED | Add-on | Conforme custo do terceiro | Repasse/add-on futuro. |
| Rules tests Tenant A × Tenant B | PLANEJADA | Interna | — | Obrigatório antes de produção. |
| E2E Customer/Owner/Driver/Platform | PLANEJADA | Interna | — | Validação. |
| Screenshots reais de evidência | PLANEJADA | Interna | — | Não fabricar. |
| Build/lint/test validados | NÃO CONFIRMADA | Interna | — | Ainda precisa execução real. |
| Deploy Cloudflare publicado | NÃO CONFIRMADA | Interna | — | Ainda precisa execução real. |

# Estado das features implementadas

Classificação auditada pelo código, testes e baseline v05. “Disponível” descreve comportamento técnico nesta versão; não concede plano comercial nem entitlement.

| Área | Estado | Evidência / limite |
|---|---|---|
| Firebase Auth | IMPLEMENTADA | Observação de sessão, login/logout, usuário atual, loading, recuperação por refresh e claim Platform Owner. |
| Membership e RBAC | IMPLEMENTADA | Membership ativa por tenant, roles existentes, resolução e guards. |
| Tenant resolver | IMPLEMENTADA | Slug → índice `tenantSlugs` → tenant ativo, sem fallback entre tenants. |
| Platform Owner | IMPLEMENTADA | Operações administrativas mínimas em callable Functions com audit. |
| Catálogo de sorveteria | IMPLEMENTADA | Categorias, produtos, tamanhos, sabores, grupos e seleção mínima/máxima; dados isolados por tenant. |
| Administração do catálogo | IMPLEMENTADA | Listar e salvar categorias/produtos, disponibilidade e personalização via backend. |
| White-label | IMPLEMENTADA | Nome, cores, contato e logo opcional por tenant. |
| Carrinho | IMPLEMENTADA | Tenant-aware, persistência local e edição de quantidade/itens. |
| Checkout | IMPLEMENTADA | Delivery ou retirada, cliente, endereço condicionado, método de pagamento e bloqueio de double-submit. |
| Criação e estado de pedido | IMPLEMENTADA | Recalcula valores no backend e rejeita transições não permitidas. |
| Tracking público | IMPLEMENTADA | Projeção limitada vinculada ao tenant e publicCode; não retorna dados internos. |
| Delivery e motorista | IMPLEMENTADA | Entrega atribuída, etapas de saída/chegada/falha e conclusão com código. |
| Delivery confirmation code | IMPLEMENTADA | Separado de publicCode, hash vinculado ao tenant/pedido, tentativas limitadas, uso único e reset com justificativa/audit. |
| QR de cardápio | IMPLEMENTADA | Tela existente preservada; QR por mesa não foi ampliado. |
| Feature flags operacionais | IMPLEMENTADA | Configuração existente; não é mecanismo de entitlement. |
| PlanCatalog / EntitlementService / Limits / gating | ADIADOS | Pertencem ao Global Standard v01 posterior; nenhum enforcement comercial nesta versão. |
| Billing / checkout SaaS | FORA DE ESCOPO | Nenhuma cobrança ou gateway foi ativado. |
| Custom domain / multi-unidade / delivery transversal | FORA DE ESCOPO | Não implementados neste goal. |

Os preços aprovados e os limites documentais permanecem os da [baseline v05](../v05-global-consolidation-ready/PRICING_AND_PLANS_APPROVED.md). Runtime não usa esses valores para limitar tenants nesta versão.

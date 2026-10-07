# FEATURE INVENTORY — auditoria do estado real

Data da auditoria: 2026-10-06

Fonte primária auditada: ZIP `SAAS_SORVETERIA_CORE_SYNC_v01.zip`.

Estados utilizados:

- `IMPLEMENTADA`
- `EM_IMPLEMENTACAO`
- `PLANEJADA`
- `DEFERRED`
- `LEGACY`
- `DESCARTADA`
- `NAO_CONFIRMADA`

> `IMPLEMENTADA` significa que existe código funcional identificável para aquela capacidade específica. Não significa produção validada. Quando build, Firebase real, Cloudflare ou testes E2E não foram executados, isso é indicado separadamente.

## Infraestrutura e arquitetura

| Módulo | Feature | Estado | Valor | Complexidade | Evidência / observação |
|---|---|---|---|---|---|
| Base web | React + TypeScript + Vite | IMPLEMENTADA | Indireto | Baixa | `package.json`, `src/main.tsx`, `src/App.tsx` |
| Firebase | Bootstrap Auth/Firestore/Storage | IMPLEMENTADA | Indireto | Baixa | `src/lib/firebase.ts`; conexão real ainda não validada |
| Cloudflare | SPA headers/redirects + estratégia de deploy | EM_IMPLEMENTACAO | Indireto | Baixa | `public/_headers`, `public/_redirects`, docs; deploy não executado |
| Multi-tenant | Resolver por slug | IMPLEMENTADA | Alto | Médio | `tenantResolver.ts`, `TenantContext.tsx` |
| Multi-tenant | Isolamento real Tenant A × Tenant B | EM_IMPLEMENTACAO | Crítico | Alto | Rules existem; testes de Rules ainda não foram implementados/executados |
| RBAC | Papéis e helpers locais | IMPLEMENTADA | Alto | Médio | `roles.ts`, `tenantAccess.ts` |
| Auth | Login/logout, sessão, membership resolution | PLANEJADA | Crítico | Médio | Firebase Auth é inicializado, mas fluxo de autenticação não existe |
| Segurança | Firestore Rules tenant-aware | EM_IMPLEMENTACAO | Crítico | Alto | `firestore.rules`; sem validação no Emulator |
| Segurança | Storage Rules tenant-aware | EM_IMPLEMENTACAO | Crítico | Alto | `storage.rules`; sem validação no Emulator |
| Plataforma | Platform Owner global | EM_IMPLEMENTACAO | Alto | Alto | role/claim prevista + shell `/admin`; administração real não existe |
| Auditoria | Contrato de audit log | EM_IMPLEMENTACAO | Alto | Médio | tipo `AuditLog` e Rules; persistência confiável não implementada |
| White-label | Branding básico por tenant | EM_IMPLEMENTACAO | Alto | Médio | cores aplicadas no storefront; logo/favicon/editor não estão completos |
| Feature flags | Booleans por tenant | IMPLEMENTADA | Médio | Baixa | `TenantFeatureFlags`; **não é entitlement de plano** |

## Experiência pública / vendas

| Módulo | Feature | Estado | Valor | Complexidade | Evidência / observação |
|---|---|---|---|---|---|
| SaaS | Landing comercial da plataforma | EM_IMPLEMENTACAO | Alto | Médio | `/`; shell visual existe, sem prova social, demo ou pricing real |
| Tenant | Storefront white-label | EM_IMPLEMENTACAO | Alto | Médio | `TenantStorefrontPage.tsx`; apenas hero/CTAs |
| Cardápio | Rota e shell do cardápio | EM_IMPLEMENTACAO | Crítico | Médio | `/cardapio`; ainda não consulta produtos |
| Catálogo | Categorias/produtos no banco | EM_IMPLEMENTACAO | Crítico | Médio | Rules/modelo conceitual; UI/repository ausentes |
| Sorveteria | Sabores, tamanhos, recipientes, grupos de opções | PLANEJADA | Crítico | Alto | especificado no contexto, não materializado no runtime |
| QR | QR Code do cardápio gerado localmente | IMPLEMENTADA | Médio | Baixa | `src/features/qr/qr.ts` + tela admin |
| QR | Pedido por mesa/local | EM_IMPLEMENTACAO | Baixo/Médio | Médio | URL + flag + `tableId`; fluxo de pedido não existe |
| Carrinho | Carrinho | PLANEJADA | Crítico | Médio | não existe runtime |
| Checkout | Entrega/retirada/pagamento/revisão | PLANEJADA | Crítico | Alto | não existe runtime |
| Pedido | Modelo/status/rules | EM_IMPLEMENTACAO | Crítico | Alto | domain + Rules; service/UI ausentes |
| Tracking | Formulário público de código | EM_IMPLEMENTACAO | Alto | Médio | UI existe; consulta real não existe |

## Operação do tenant

| Módulo | Feature | Estado | Valor | Complexidade | Evidência / observação |
|---|---|---|---|---|---|
| Painel | Tenant admin shell | EM_IMPLEMENTACAO | Alto | Médio | `/painel`; sem módulos funcionais |
| Pedidos | Gestão operacional de pedidos | PLANEJADA | Crítico | Alto | não existe tela/service |
| KDS | Tela de preparo | PLANEJADA | Alto | Médio | somente feature flag default `true` |
| Delivery | Modelo de entrega e Rules | EM_IMPLEMENTACAO | Alto | Alto | `delivery.ts` + Rules; UI/services ausentes |
| Driver | Portal mobile do entregador | PLANEJADA | Alto | Alto | não existe runtime |
| Código entrega | Hash/campo conceitual | EM_IMPLEMENTACAO | Alto | Médio | campo existe; geração/validação/lockout ausentes |
| Caixa | Abertura/fechamento/sangria/suprimento | PLANEJADA | Alto | Alto | coleção autorizada nas Rules, sem domínio/UI |
| Financeiro | Transações/relatórios | PLANEJADA | Alto | Alto | coleção autorizada nas Rules, sem domínio/UI |
| Cupons | Cupons | PLANEJADA | Médio | Médio | flag existe `false` |
| Estoque | Estoque | PLANEJADA | Alto | Alto | flag existe `false` |
| Relatórios | Relatórios operacionais/financeiros | PLANEJADA | Alto | Médio/Alto | não existe runtime |
| Equipe | Gestão real de usuários/memberships | PLANEJADA | Alto | Médio | Rules prevê memberships; UI não existe |
| Ajuda | Onboarding / central de ajuda | PLANEJADA | Médio | Médio | padrão documentado, sem telas |

## Testes e evidência

| Módulo | Feature | Estado | Observação |
|---|---|---|---|
| Unit | Testes de feature flags | IMPLEMENTADA | arquivo existente; execução anterior não confirmada |
| Unit | Testes de tenant access | IMPLEMENTADA | arquivo existente; execução anterior não confirmada |
| Rules | Tenant A × Tenant B | PLANEJADA | `tests/rules/README.md` lista cenários, não implementa os testes |
| E2E | Customer / Owner / Driver / Platform | PLANEJADA | ausente |
| Screenshots | Evidência real | PLANEJADA | diretório existe, sem screenshots fabricados |
| Build | build/lint/test executados | NAO_CONFIRMADA | v01 declarou explicitamente que não executou npm install/build/tests |
| Deploy | Cloudflare publicado | NAO_CONFIRMADA | não executado no v01 |

## Conclusão da auditoria

O produto atual é uma **foundation coerente**, não um SaaS comercialmente pronto. Pricing pode ser definido como estratégia, mas a landing não deve vender funcionalidades planejadas como se estivessem disponíveis hoje.

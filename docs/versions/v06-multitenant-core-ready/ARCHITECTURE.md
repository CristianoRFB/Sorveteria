# Arquitetura

## Visão geral

- SPA React + TypeScript + Vite com rotas públicas e rotas por `tenantSlug`.
- `AuthProvider` resolve usuário e custom claim; `TenantProvider` resolve o tenant atual; `TenantMembershipProvider` carrega a autorização para o tenant ativo.
- Guard de `/admin` exige `platform_owner`; telas de painel exigem membership ativa e role permitida.
- Firestore fornece leitura pública estritamente limitada e dados tenant-scoped. Mutação privilegiada passa por callable Cloud Functions.
- Firebase Auth, Firestore, Functions e Storage são executados localmente via Firebase Emulator Suite.

## Resolução e isolamento

`/:tenantSlug/*` → resolver slug → tenant ativo → contexto tenant → membership para o UID atual → rota/ação autorizada. Uma troca de slug remonta o contexto e o carrinho usa chave por tenant. Um tenant ausente, suspenso ou com erro não resolve silenciosamente para outro.

## Fluxos

- Cliente lê branding e catálogo público, personaliza produto e armazena o carrinho no contexto local de seu tenant.
- Checkout chama `createOrder`; a Function relê catálogo e settings, recalcula opções, subtotal, taxa e total, grava pedido e projeção de tracking.
- Equipe atualiza status por callable com transições permitidas. A atribuição grava a entrega no tenant.
- Driver autenticado lê somente entrega atribuída a seu UID e move estados permitidos. A confirmação exige código de entrega vinculado ao pedido e ao tenant.
- Platform Owner usa claim server-issued e callable Functions para listar/criar/suspender/reativar tenant e assumir contexto operacional auditável.

## Ambiente

`firebase.json` define emuladores locais com portas próprias para evitar colisão com outros projetos no host. `.env.example` contém somente valores de demonstração. As functions pedem Node 20; no host de validação o emulador executou com Node 24 e emitiu aviso de versão.

Fonte Mermaid e SVG: [manifesto de diagramas](../../DIAGRAMS_MANIFEST.md).

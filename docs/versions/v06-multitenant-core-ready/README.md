# Sorveteria — core multi-tenant

Versão executável do core multi-tenant e do fluxo essencial ponta a ponta. Esta versão evolui a codebase v05 existente; não implementa entitlements comerciais nem billing.

## Conteúdo

- [Estado e readiness](STATUS.md)
- [Arquitetura](ARCHITECTURE.md)
- [Modelo de dados](DATA_MODEL.md)
- [Segurança](SECURITY.md)
- [Estrutura Firebase](FIREBASE_STRUCTURE.md)
- [Estrutura do projeto](PROJECT_STRUCTURE.md)
- [Telas e evidências](SCREENS.md)
- [Visuais conceituais](GENERATED_VISUALS.md)
- [Leads](LEADS_OVERVIEW.md)
- [Diagramas editáveis e renderizados](../../DIAGRAMS_MANIFEST.md)
- [Manifesto de leads](../../LEADS_MANIFEST.md)

## Fonte canônica

`docs/versions/v05-global-consolidation-ready/` é a fonte aprovada para pricing, planos e matriz de features. Os preços e limites nessa fonte foram preservados. A implementação usa Firebase Auth, Firestore, Cloud Functions e Storage Emulators no desenvolvimento; não há deploy ou credenciais de produção neste pacote.

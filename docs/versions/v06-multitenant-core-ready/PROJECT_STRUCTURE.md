# Estrutura do projeto

```text
src/
  components/      guards, formulários de autenticação e estados comuns
  context/         Auth, tenant, membership e carrinho
  domain/          catálogo, membership, cart, pedidos, auditoria e tracking
  hooks/           acesso tipado aos contexts
  lib/             inicialização Firebase e clients
  pages/           landing, loja, catálogo, admin, checkout, tracking e driver
  schemas/         validação de payloads de domínio
  services/        leitura Firebase e chamadas callable
functions/index.js backend confiável para ações e transições
firestore.rules    autorização de documentos
storage.rules      autorização de arquivos por tenant
tests/             unitários, Rules e integração com emulador
scripts/           seed, dev local, validações e docs
docs/versions/     snapshots canônicos imutáveis por versão
```

Comandos locais: `npm run dev:emulator`, `npm run emulators`, `npm run seed:emulator`, `npm run test`, `npm run test:rules`, `npm run test:integration`, `npm run build`, `npm run lint`, `npm run docs:diagrams`, `npm run docs:check`, `npm run docs:leads`.

O código de documentação vive em `scripts/docs-*.mjs`. O diretório `docs/versions/v05-global-consolidation-ready/` é preservado como baseline comercial; `v06-multitenant-core-ready/` documenta o estado implementado.

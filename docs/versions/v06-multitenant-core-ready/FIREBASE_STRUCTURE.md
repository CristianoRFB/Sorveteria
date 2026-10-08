# Estrutura Firebase

## Serviços usados

| Serviço | Papel | Desenvolvimento |
|---|---|---|
| Authentication | sessão email/senha, UID e custom claim Platform Owner | Emulator Auth `127.0.0.1:9099` |
| Firestore | tenants, memberships, settings, catálogo, pedidos, tracking, entregas e audit | Emulator Firestore `127.0.0.1:8088` |
| Cloud Functions v2 | autorização e mutações confiáveis | Emulator Functions `127.0.0.1:5001`, região `southamerica-east1` |
| Storage | assets públicos e privados por tenant | Emulator Storage `127.0.0.1:9415` |

`.env.example` documenta chaves públicas de configuração apenas como exemplo local; `scripts/dev-emulator.mjs` injeta valores demo e `VITE_USE_EMULATORS=true`. `scripts/seed-emulator.mjs` recusa rodar sem `demo-sorveteria` e hosts locais esperados; cria alpha/beta e 9 contas de teste.

## Regras e índices

- `firestore.rules` é deny-by-default e restringe leitura por role e tenant.
- `storage.rules` exige tenant ativo e membership/role para upload; paths não explicitamente mapeados são negados.
- `firestore.indexes.json` contém os índices usados pelas queries tenant-scoped.

## Portas locais

Auth 9099 · Firestore 8088 · Functions 5001 · Storage 9415 · Emulator Hub 4415 · Logging 4515 · Eventarc 9315 · Tasks 9515 · Firestore websocket 9165 · Emulator UI 4015. As portas diferem das padrão para convivência com outros projetos locais.

## Segurança operacional

O projeto demo bloqueia chamadas não emuladas. Não há deploy, criação de recursos pagos, uso de projeto Firebase real ou credenciais de produção nesta execução.

# Firestore Rules tests

A base já inclui `@firebase/rules-unit-testing` e o script `npm run test:rules`.

Os cenários P0 a implementar/expandir durante a próxima rodada são:

- Platform Owner acessa tenant-alpha e tenant-beta;
- owner-alpha acessa somente tenant-alpha;
- owner-beta acessa somente tenant-beta;
- customer-alpha não acessa dados beta;
- driver-alpha não acessa entregas beta;
- tenant suspenso bloqueia operação pública;
- cliente não altera preço, role ou confirmação privilegiada.

Este diretório não finge que os testes foram executados: o scaffold deve ser validado no Emulator após `npm install`.

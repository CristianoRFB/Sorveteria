# DEPLOYMENT

## Estratégia

- um deploy Cloudflare compartilhado na vertical Sorveteria;
- um Firebase para a vertical, salvo decisão futura justificada;
- tenants resolvidos por slug/host;
- não criar deploy/Firebase por cliente.

## Cloudflare

Build esperado:

```bash
npm run build
```

Output:

```text
dist/
```

Configure fallback de SPA/deep links no ambiente escolhido.

Não foi realizado deploy durante a geração deste ZIP.


## SPA fallback e headers

`public/_redirects` preserva deep links no Cloudflare Pages e `public/_headers` adiciona headers básicos sem inventar uma CSP antes de validar integrações reais.

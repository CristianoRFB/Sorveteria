# DEMO E LANDING COMERCIAL

## Estado atual auditado

Existe uma landing em `/`, mas ela é uma fundação visual simples.

Não existem hoje:

- screenshots reais de fluxos completos;
- pricing page funcional;
- CTA de contratação integrado;
- trial engine;
- demo entitlement real;
- onboarding comercial completo.

## Correção de verdade comercial

A landing atual não deve afirmar que módulos planejados estão disponíveis como produto pronto.

Enquanto o SaaS estiver em `FOUNDATION`, a comunicação deve deixar explícito:

- produto em desenvolvimento/validação;
- demonstração técnica;
- recursos planejados não equivalem a recursos disponíveis.

## Estrutura alvo da landing — NEXT

```text
Hero
↓
Problema real da sorveteria
↓
Benefícios
↓
Screenshots REAIS
↓
Fluxo cliente → pedido → operação
↓
Funcionalidades disponíveis hoje
↓
Planos
↓
Comparação curta
↓
FAQ
↓
CTA para demo / contato
```

## Pricing na landing

Quando a operação core estiver implementada e validada:

- mostrar Essencial / Pro / Premium;
- Pro marcado como `Recomendado`;
- mensal e anual;
- diferenças decisivas, não 40 linhas;
- botão `Comparar todos os recursos` para matriz extensa;
- indicar claramente features futuras se alguma estiver em beta.

## Demo comercial

Padrão futuro:

```text
DEMO TENANT
plan = premium_demo
subscriptionStatus = demo
```

A demo personalizada para lead deve usar configuração/seed, não fork de código.

Para Sol de Verão, se usada como lead de referência:

- branding configurável;
- dados demonstrativos marcados como demo quando não forem dados reais confirmados;
- nenhuma feature inexistente deve ser “encenada” como implementada.

## Critério para publicar preços como contratação real

Somente depois de:

1. fluxo cardápio → carrinho → checkout → pedido funcionar;
2. auth/memberships e Rules terem testes reais;
3. operação de pedido estar utilizável;
4. pelo menos o conjunto do Essencial existir de ponta a ponta;
5. entitlements mínimos estarem implementados se mais de um plano for comercializado.

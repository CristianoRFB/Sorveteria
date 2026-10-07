# DECISOES

## APROVADO / RECOMENDADO

- manter **3 planos**;
- usar **Essencial / Pro / Premium**;
- destacar **Pro** como `RECOMENDADO`;
- manter herança: Pro = Essencial + extras; Premium = Pro + extras;
- não limitar pedidos artificialmente na proposta inicial;
- não vender segurança, isolamento ou integridade como privilégio Premium;
- manter pricing apenas como **proposta** até aprovação comercial;
- implementar entitlement somente depois do core utilizável;
- demo futura como `premium_demo`, sem exceção hardcoded por tenant;
- começar atribuição de plano manual pelo Platform Owner antes de gateway;
- preservar dados em downgrade.

## PRECISA DE MINHA DECISÃO

1. Aprovar ou alterar preços:
   - Essencial: R$ 69,90/mês;
   - Pro: R$ 129,90/mês;
   - Premium: R$ 229,90/mês.
2. Aprovar anual:
   - R$ 699;
   - R$ 1.299;
   - R$ 2.299.
3. Aprovar limites:
   - usuários: 2 / 5 / 15;
   - entregadores: 1 / 5 / 15.
4. Confirmar `delivery simples` já no Essencial.
5. Confirmar `QR por mesa/local` como Pro.
6. Definir futuramente preço de:
   - custom domain;
   - unidade adicional;
   - integrações pagas/migração especial.
7. Decidir implantação/trial quando o core estiver comercialmente demonstrável.

## NÃO FAZER AGORA

- gateway de cobrança;
- webhooks de assinatura;
- custom domain;
- multi-unidade;
- marketplace;
- delivery transversal;
- estoque/CMV avançado;
- integrações premium;
- refatorar Rules fingindo entitlements;
- publicar pricing como contratação real antes do Essencial funcionar de ponta a ponta.

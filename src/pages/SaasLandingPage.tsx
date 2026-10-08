import { Link } from "react-router-dom";

const foundationCapabilities = [
  "Cardápio e personalização por sorveteria",
  "Pedidos com acompanhamento público",
  "Retirada e entrega simples",
  "Acesso administrativo protegido",
];

const proposedPlans = [
  { name: "Essencial", price: "R$ 69,90", annual: "R$ 699/ano", note: "Aprovado · contratação indisponível" },
  { name: "Pro", price: "R$ 129,90", annual: "R$ 1.299/ano", note: "Aprovado · recomendado" },
  { name: "Premium", price: "R$ 229,90", annual: "R$ 2.299/ano", note: "Aprovado · contratação indisponível" },
];

export function SaasLandingPage() {
  return (
    <main className="marketing">
      <section className="hero">
        <span className="eyebrow">SaaS para sorveterias · operação em validação</span>
        <h1>Uma base multi-tenant e white-label para vender direto e organizar a operação.</h1>
        <p>
          O fluxo de cardápio, pedido, acompanhamento e entrega está em validação. A contratação
          ainda não está disponível e nenhum pagamento é processado por esta página.
        </p>
        <div className="actions">
          <Link className="button primary" to="/admin">Acesso administrativo</Link>
        </div>
      </section>

      <section aria-labelledby="foundation-title">
        <span className="eyebrow">Fluxo essencial</span>
        <h2 id="foundation-title">Venda direta e operação básica</h2>
        <div className="feature-grid">
          {foundationCapabilities.map((item) => (
            <article className="feature-card" key={item}><strong>{item}</strong></article>
          ))}
        </div>
      </section>

      <section className="pricing-preview" aria-labelledby="pricing-title">
        <span className="eyebrow">Preços aprovados</span>
        <h2 id="pricing-title">Planos documentados — sem contratação online</h2>
        <p className="muted">
          Os preços estão aprovados para a vertical, mas a camada comercial e a contratação ainda
          não estão habilitadas. Não há enforcement de plano nesta versão.
        </p>
        <div className="feature-grid">
          {proposedPlans.map((plan) => (
            <article className="feature-card" key={plan.name}>
              <span className="plan-status">{plan.note}</span>
              <h3>{plan.name}</h3>
              <strong className="plan-price">{plan.price}<small>/mês</small></strong>
              <span className="plan-annual">{plan.annual}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

import { Link } from "react-router-dom";

const foundationCapabilities = [
  "Arquitetura multi-tenant",
  "White-label por tenant",
  "QR Code próprio",
  "Firebase tenant-aware em evolução",
];

const proposedPlans = [
  { name: "Essencial", price: "R$ 69,90", note: "Proposta" },
  { name: "Pro", price: "R$ 129,90", note: "Proposta · recomendado" },
  { name: "Premium", price: "R$ 229,90", note: "Proposta" },
];

export function SaasLandingPage() {
  return (
    <main className="marketing">
      <section className="hero">
        <span className="eyebrow">SaaS para sorveterias · foundation em validação</span>
        <h1>Uma base multi-tenant e white-label para vender direto e organizar a operação.</h1>
        <p>
          Este ambiente ainda é uma fundação técnica. Recursos de compra, operação, delivery,
          caixa e financeiro continuam sendo implementados e não devem ser interpretados como
          produto comercial completo hoje.
        </p>
        <div className="actions">
          <Link className="button primary" to="/admin">Abrir foundation do Platform Admin</Link>
        </div>
      </section>

      <section aria-labelledby="foundation-title">
        <span className="eyebrow">Disponível nesta foundation</span>
        <h2 id="foundation-title">O que já possui base materializada</h2>
        <div className="feature-grid">
          {foundationCapabilities.map((item) => (
            <article className="feature-card" key={item}><strong>{item}</strong></article>
          ))}
        </div>
      </section>

      <section className="pricing-preview" aria-labelledby="pricing-title">
        <span className="eyebrow">Estrutura comercial em teste</span>
        <h2 id="pricing-title">Planos propostos — ainda não disponíveis para contratação</h2>
        <p className="muted">
          Os valores abaixo orientam o desenho do produto. Entitlements, billing e feature gating
          por plano ainda não estão implementados.
        </p>
        <div className="feature-grid">
          {proposedPlans.map((plan) => (
            <article className="feature-card" key={plan.name}>
              <span className="plan-status">{plan.note}</span>
              <h3>{plan.name}</h3>
              <strong className="plan-price">{plan.price}<small>/mês</small></strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

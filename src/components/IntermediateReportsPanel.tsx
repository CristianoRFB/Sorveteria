import {useEffect,useState} from "react";
import {loadIntermediateReport,type IntermediateReport} from "@/services/intermediateReportsService";
import {LoadingState} from "@/components/LoadingState";
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
function ReportContent({report:r}:{report:IntermediateReport}){
  const max=Math.max(1,...r.buckets.map(b=>b.totalOrders));
  const cards=[
    {label:"Pedidos na amostra",value:String(r.sampledOrders)},
    {label:"Concluídos",value:String(r.completedOrders)},
    {label:"Cancelados",value:String(r.cancelledOrders)},
    {label:"Valor de pedidos concluídos",value:money(r.completedAmountCents)},
  ];
  return <>
    {r.truncated&&<p className="notice" role="alert"><strong>Amostra parcial:</strong> mais de 500
      pedidos no período. Os indicadores desta tela consideram somente os 500 mais recentes.
      Consulte o Resumo de vendas para os totais completos.</p>}
    <div className="sales-summary-grid">{cards.map(c=><div className="sales-summary-metric" key={c.label}>
      <span>{c.label}</span><strong>{c.value}</strong></div>)}</div>
    <div className="reports-layout">
      <section className="reports-card"><h3>Tendência operacional</h3>
        <p className="form-hint">Faixas consecutivas de 24 horas desde o início do período.
          Pedidos classificados pelo status atual.</p>
        <div className="reports-trend" role="list" aria-label="Pedidos por faixa de 24 horas">
          {r.buckets.map((b,i)=><div className="reports-trend-row" role="listitem" key={b.start}>
            <time dateTime={b.start} title={new Date(b.start).toLocaleString("pt-BR")}>{i+1}ª faixa</time>
            <div className="reports-bar-track"><div className="reports-bar-fill"
              style={{width:String(b.totalOrders/max*100)+"%"}}/></div>
            <span>{b.totalOrders} pedidos</span>
          </div>)}
        </div>
      </section>
      <section className="reports-card"><h3>Modalidade de atendimento</h3>
        <div className="reports-fulfillment">
          <p>Retirada <strong>{r.fulfillment.pickup.orders} pedidos</strong>
            <small>{r.fulfillment.pickup.completedOrders} concluídos</small></p>
          <p>Entrega <strong>{r.fulfillment.delivery.orders} pedidos</strong>
            <small>{r.fulfillment.delivery.completedOrders} concluídos</small></p>
        </div>
        <h3>Produtos mais pedidos</h3>
        <p className="form-hint">Unidades em pedidos concluídos, sem custos ou saldo de estoque.</p>
        {r.topProducts.length===0?<p className="muted">Nenhum produto concluído na amostra.</p>:
          <ol className="reports-products">{r.topProducts.map((x,i)=><li key={i}>
            <span>{x.name}</span><strong>{x.quantity} un.</strong>
          </li>)}</ol>}
      </section>
    </div>
    <p className="form-hint">De {new Date(r.periodStart).toLocaleString("pt-BR")} até
      {" "}{new Date(r.periodEnd).toLocaleString("pt-BR")}. Valores são pedidos concluídos,
      não pagamentos recebidos, receitas conciliadas ou lucros.</p>
  </>;
}
export function IntermediateReportsPanel({tenantId}:{tenantId:string}){
  const [days,setDays]=useState<7|30>(7);
  const [version,setVersion]=useState(0);
  const [report,setReport]=useState<IntermediateReport|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    loadIntermediateReport(tenantId,days).then(r=>{if(active){setReport(r);setError(null);}})
      .catch(e=>{if(active){setReport(null);setError(e instanceof Error?e.message:"Falha ao carregar relatório.");}})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[tenantId,days,version]);
  return <section className="admin-section" aria-labelledby="intermediate-reports-title">
    <div className="section-heading"><div><span className="eyebrow">Pro / Premium</span>
      <h2 id="intermediate-reports-title">Relatórios intermediários</h2></div>
      <div className="sales-summary-controls">
        <label htmlFor="reports-period">Período<select id="reports-period" value={days} disabled={busy}
          onChange={e=>{setBusy(true);setReport(null);setDays(Number(e.target.value)===30?30:7);}}>
          <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
        </select></label>
        <button type="button" className="button secondary" disabled={busy}
          onClick={()=>{setBusy(true);setReport(null);setVersion(x=>x+1);}}>Atualizar</button>
      </div></div>
    <p className="muted">Análise operacional de pedidos sem dados pessoais dos clientes.</p>
    {busy&&<LoadingState label="Calculando tendências..."/>}
    {!busy&&error&&<p className="error-text" role="alert">{error}</p>}
    {!busy&&report&&<ReportContent report={report}/>}
  </section>;
}

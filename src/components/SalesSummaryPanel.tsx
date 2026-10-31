import { useEffect, useState } from "react";
import { loadBasicSalesSummary, type BasicSalesSummary } from "@/services/salesSummaryService";
import { LoadingState } from "@/components/LoadingState";

function money(cents:number){
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
}
/** Read-only, no PII or financial reconciliation. Period is based on order creation time. */
export function SalesSummaryPanel({tenantId}:{tenantId:string}){
  const [days,setDays]=useState<7|30>(7);
  const [reload,setReload]=useState(0);
  const [summary,setSummary]=useState<BasicSalesSummary|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    loadBasicSalesSummary(tenantId,days).then(result=>{
      if(!active)return;
      setSummary(result);setError(null);
    }).catch(e=>{
      if(!active)return;
      setSummary(null);
      setError(e instanceof Error?e.message:"Não foi possível carregar o resumo.");
    }).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[tenantId,days,reload]);
  const changeDays=(value:7|30)=>{setBusy(true);setSummary(null);setDays(value);};
  const refresh=()=>{setBusy(true);setSummary(null);setReload(v=>v+1);};
  const cards=summary?[
    {name:"Pedidos recebidos",value:String(summary.totalOrders)},
    {name:"Concluídos",value:String(summary.completedOrders)},
    {name:"Em andamento",value:String(summary.pendingOrders)},
    {name:"Cancelados",value:String(summary.cancelledOrders)},
    {name:"Valor dos concluídos",value:money(summary.completedAmountCents)},
    {name:"Ticket médio concluído",value:money(summary.averageCompletedTicketCents)},
  ]:[];
  return <section className="admin-section" aria-labelledby="sales-summary-title">
    <div className="section-heading">
      <div><span className="eyebrow">Indicadores operacionais</span><h2 id="sales-summary-title">Resumo de pedidos</h2></div>
      <div className="sales-summary-controls">
        <label htmlFor="sales-period">Período<select id="sales-period" value={days}
          onChange={e=>changeDays(Number(e.target.value)===30?30:7)}
          disabled={busy}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label>
        <button type="button" className="button secondary" disabled={busy} onClick={refresh}>Atualizar</button>
      </div>
    </div>
    <p className="muted">Pedidos criados no período, classificados pelo estado atual. Valores representam
      pedidos concluídos, não pagamentos confirmados nem faturamento contábil.</p>
    {busy && <LoadingState label="Calculando indicadores..." />}
    {!busy && error && <p className="error-text" role="alert">{error}</p>}
    {!busy && summary && <>
      <div className="sales-summary-grid" aria-live="polite">
        {cards.map(card=><div className="sales-summary-metric" key={card.name}>
          <span>{card.name}</span><strong>{card.value}</strong>
        </div>)}
      </div>
      {summary.totalOrders===0 && <p className="muted">Nenhum pedido registrado neste período.</p>}
      <p className="form-hint">Consulta de {new Date(summary.periodStart).toLocaleString("pt-BR")}
        {" até "}{new Date(summary.periodEnd).toLocaleString("pt-BR")}. Não inclui custos, taxas de operadora ou estornos.</p>
    </>}
  </section>;
}

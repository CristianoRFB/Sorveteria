import {useEffect,useRef,useState,type FormEvent} from "react";
import {loadCashRegister,openCashShift,recordCashMovement,closeCashShift,
  type CashSnapshot} from "@/services/cashRegisterService";
import {LoadingState} from "@/components/LoadingState";
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
function centsFromInput(value:string):number{
  const amount=Number(value.replace(",","."));
  return Number.isFinite(amount)?Math.round(amount*100):Number.NaN;
}
export function CashRegisterPanel({tenantId}:{tenantId:string}){
  const [data,setData]=useState<CashSnapshot|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [refreshRequired,setRefreshRequired]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [opening,setOpening]=useState("0.00");
  const [amount,setAmount]=useState("");
  const [kind,setKind]=useState<"inflow"|"outflow">("inflow");
  const [note,setNote]=useState("");
  const [counted,setCounted]=useState("");
  // Reuse operation IDs after ambiguous network failure while the form remains unchanged.
  const attempt=useRef<{signature:string;id:string}|null>(null);
  function requestId(signature:string){
    if(attempt.current?.signature===signature)return attempt.current.id;
    const id=crypto.randomUUID();attempt.current={signature,id};return id;
  }
  async function refresh(){
    const result=await loadCashRegister(tenantId);
    setData(result);
  }
  useEffect(()=>{
    let active=true;
    loadCashRegister(tenantId).then(x=>{if(active){setData(x);setError(null);}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Falha ao consultar o caixa.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[tenantId]);
  async function perform(op:()=>Promise<void>,success:string,onSuccess?:()=>void){
    setBusy(true);setError(null);setNotice(null);
    let committed=false;
    try{
      await op();
      committed=true;
      attempt.current=null;
      onSuccess?.();
      await refresh();
      setRefreshRequired(false);
      setNotice(success);
    }catch(e){
      if(committed){
        setRefreshRequired(true);
        setError("Operação confirmada, mas a atualização do painel falhou. Clique em Atualizar antes de lançar outra movimentação.");
      }else{
        setError(e instanceof Error?e.message:"Operação de caixa não concluída.");
      }
    }finally{setBusy(false);}
  }
  function open(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const openingCents=centsFromInput(opening);
    void perform(async()=>{await openCashShift(tenantId,openingCents,
      requestId("open:"+openingCents));},"Turno aberto. Confira o saldo inicial antes de lançar movimentos.");
  }
  function move(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const active=data?.activeShift;if(!active)return;
    const amountCents=centsFromInput(amount),description=note.trim();
    void perform(async()=>{await recordCashMovement({tenantId,shiftId:active.id,
      kind,amountCents,note:description,
      requestId:requestId(JSON.stringify(["movement",active.id,kind,amountCents,description]))});},
      "Lançamento manual registrado e auditado.",()=>{setAmount("");setNote("");});
  }
  function close(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const active=data?.activeShift;if(!active)return;
    const countedCents=centsFromInput(counted);
    if(!window.confirm("Conferiu o dinheiro contado? O fechamento não pode ser desfeito."))return;
    void perform(async()=>{await closeCashShift(tenantId,active.id,countedCents);},
      "Turno encerrado e diferença de fechamento registrada.",()=>setCounted(""));
  }
  if(loading)return <LoadingState label="Carregando caixa operacional..."/>;
  if(!data)return <section className="admin-section">
    <h2>Caixa operacional</h2><p className="error-text" role="alert">{error??"Caixa indisponível."}</p>
    <button type="button" className="button secondary" onClick={()=>{setLoading(true);
      void loadCashRegister(tenantId).then(setData).catch(e=>setError(String(e))).finally(()=>setLoading(false));}}>
      Tentar novamente</button></section>;
  const shift=data.activeShift;
  return <section className="admin-section" aria-labelledby="cash-title">
    <div className="section-heading"><div><span className="eyebrow">Caixa Pro/Premium</span>
      <h2 id="cash-title">Caixa operacional manual</h2></div>
      <button type="button" className="button secondary" disabled={busy}
        onClick={()=>void perform(async()=>{}, "Caixa atualizado.")}>Atualizar</button></div>
    <p className="muted">Registre somente dinheiro físico realmente conferido.
      Pedidos, PIX, cartão e taxas não são importados automaticamente;
      estes valores não representam faturamento nem conciliação bancária.</p>
    {error&&<p className="error-text" role="alert">{error}</p>}
    {refreshRequired&&<p className="notice" role="status">Nenhum novo lançamento será aceito nesta tela até atualizar o estado do caixa.</p>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {!shift?<form className="form-grid cash-form" onSubmit={open}>
      <h3>Abrir turno de caixa</h3>
      <label>Troco inicial (R$)<input type="number" required min="0" max="50000"
        step="0.01" value={opening} onChange={e=>setOpening(e.target.value)}/></label>
      <button className="button primary" type="submit" disabled={busy||refreshRequired}>
        {busy?"Registrando...":"Abrir caixa"}</button>
    </form>:<>
      <div className="cash-metrics">
        <div><span>Saldo inicial</span><strong>{money(shift.openingCents)}</strong></div>
        <div><span>Entradas manuais</span><strong>{money(shift.inflowCents)}</strong></div>
        <div><span>Saídas manuais</span><strong>{money(shift.outflowCents)}</strong></div>
        <div><span>Saldo esperado</span><strong>{money(shift.expectedCents)}</strong></div>
      </div>
      <div className="cash-layout">
        <form className="form-grid cash-form" onSubmit={move}>
          <h3>Registrar entrada ou saída</h3>
          <label>Movimentação<select value={kind} disabled={busy}
            onChange={e=>setKind(e.target.value as "inflow"|"outflow")}>
            <option value="inflow">Entrada de dinheiro</option><option value="outflow">Saída de dinheiro</option>
          </select></label>
          <label>Valor (R$)<input type="number" required min="0.01" max="10000" step="0.01"
            value={amount} onChange={e=>setAmount(e.target.value)}/></label>
          <label>Motivo / referência (3 a 160 caracteres)<textarea required minLength={3} maxLength={160} rows={3}
            value={note} onChange={e=>setNote(e.target.value)}/></label>
          <button type="submit" className="button primary" disabled={busy||refreshRequired}>
            {busy?"Registrando...":"Registrar lançamento"}</button>
        </form>
        <form className="form-grid cash-form" onSubmit={close}>
          <h3>Fechar turno</h3>
          <p className="form-hint">Conte o dinheiro físico antes de fechar.
            A diferença será preservada junto do histórico.</p>
          <label>Dinheiro contado (R$)<input type="number" required min="0" max="100000" step="0.01"
            value={counted} onChange={e=>setCounted(e.target.value)}/></label>
          {counted!==""&&Number.isFinite(centsFromInput(counted))&&
            <p className="notice">Diferença prevista: {money(centsFromInput(counted)-shift.expectedCents)}</p>}
          <button type="submit" className="button secondary" disabled={busy||refreshRequired}>
            {busy?"Processando...":"Conferir e fechar caixa"}</button>
        </form>
      </div>
      <div className="cash-movements">
        <h3>Últimos lançamentos do turno</h3>
        {data.movements.length===0?<p className="muted">Nenhuma entrada ou saída manual.</p>:
          <ul>{data.movements.map(x=><li key={x.id}>
            <div><strong>{x.kind==="inflow"?"Entrada":"Saída"}</strong>
              <span>{x.note}</span><small>{x.createdAt?new Date(x.createdAt).toLocaleString("pt-BR"):""}</small></div>
            <strong>{x.kind==="inflow"?"+":"−"}{money(x.amountCents)}</strong>
          </li>)}</ul>}
        {data.movements.length===30&&<p className="form-hint">Exibindo apenas os 30 lançamentos mais recentes.</p>}
      </div>
    </>}
    <div className="cash-history"><h3>Últimos turnos</h3>
      {data.recentShifts.length===0?<p className="muted">Nenhum turno registrado.</p>:
        <ul>{data.recentShifts.map(x=><li key={x.id}>
          <div><strong>{x.status==="open"?"Aberto":"Fechado"}</strong>
            <span>{x.openedAt?new Date(x.openedAt).toLocaleString("pt-BR"):""}</span></div>
          <div><span>Esperado: {money(x.expectedCents)}</span>
            {x.countedCents!==null&&<span>Contado: {money(x.countedCents)}</span>}
            {x.differenceCents!==null&&<strong>Diferença: {money(x.differenceCents)}</strong>}</div>
        </li>)}</ul>}
      <p className="form-hint">Exibindo os 10 turnos mais recentes. Histórico completo permanece armazenado.</p>
    </div>
  </section>;
}

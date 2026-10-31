import {useCallback,useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTenant} from "@/hooks/useTenant";
import {canUseTenantFeature,featureAccessMessage} from "@/domain/entitlements";
import {changeOrderStatus} from "@/services/orderService";
import {loadKitchenBoard,type KitchenBoard,type KitchenStatus,type KitchenTicket} from "@/services/kitchenService";
import {LoadingState} from "@/components/LoadingState";
import {ErrorState} from "@/components/ErrorState";

const columns=[
  {status:"received",title:"Recebidos",action:"Confirmar pedido",next:"confirmed"},
  {status:"confirmed",title:"Confirmados",action:"Iniciar preparo",next:"preparing"},
  {status:"preparing",title:"Em preparo",action:"Marcar pronto",next:"ready"},
  {status:"ready",title:"Prontos",action:null,next:null},
] as const;
const statusLabels:Record<KitchenStatus,string>={
  received:"Recebido",confirmed:"Confirmado",preparing:"Em preparo",ready:"Pronto",
};
const pretty=(value:string)=>value.replace(/[-_]/g," ");
function Ticket({ticket,busy,onAdvance}:{ticket:KitchenTicket;busy:boolean;onAdvance:(order:KitchenTicket)=>void}){
  const current=columns.find(col=>col.status===ticket.status);
  const age=ticket.createdAt?new Date(ticket.createdAt):null;
  const createdAt=age&&!Number.isNaN(age.getTime())?age.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Horário indisponível";
  return <article className="kitchen-ticket">
    <header className="kitchen-ticket-heading">
      <div><strong>{ticket.publicCode}</strong><span>{ticket.fulfillmentMode==="delivery"?"Entrega":"Retirada"} · {createdAt}</span></div>
      <span className={`status-pill status-${ticket.status}`}>{statusLabels[ticket.status]}</span>
    </header>
    <ul className="kitchen-ticket-items">{ticket.items.map((item,i)=><li key={i}>
      <strong>{item.quantity}× {item.name}</strong>
      {Object.entries(item.selections).filter(([,choices])=>choices.length>0)
        .map(([name,choices])=><small key={name}>{pretty(name)}: {choices.map(pretty).join(", ")}</small>)}
    </li>)}</ul>
    {current?.action&&<button className="button primary full-width" type="button" disabled={busy}
      onClick={()=>onAdvance(ticket)}>{busy?"Atualizando...":current.action}</button>}
    {ticket.status==="ready"&&<p className="form-hint">Pronto para encaminhar à entrega ou retirada no painel de pedidos.</p>}
  </article>;
}
function KitchenView({tenantId,slug}:{tenantId:string;slug:string}){
  const [board,setBoard]=useState<KitchenBoard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [refreshKey,setRefreshKey]=useState(0);
  const refresh=useCallback(()=>setRefreshKey(v=>v+1),[]);
  useEffect(()=>{
    let alive=true,working=false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const schedule=(delay:number)=>{
      if(timer)clearTimeout(timer);
      if(alive&&document.visibilityState!=="hidden")timer=setTimeout(()=>void read(),delay);
    };
    async function read(){
      if(!alive||working||document.visibilityState==="hidden")return;
      working=true;
      try{
        const result=await loadKitchenBoard(tenantId);
        if(alive){setBoard(result);setError(null);}
      }catch(e){
        if(alive)setError(e instanceof Error?e.message:"Falha ao atualizar a cozinha.");
      }finally{
        working=false;
        if(alive){setLoading(false);schedule(12_000);}
      }
    }
    const visibility=()=>{
      if(document.visibilityState==="visible")schedule(0);
      else if(timer)clearTimeout(timer);
    };
    document.addEventListener("visibilitychange",visibility);
    void read();
    return ()=>{alive=false;if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",visibility);};
  },[tenantId,refreshKey]);
  async function advance(ticket:KitchenTicket){
    const current=columns.find(col=>col.status===ticket.status);
    if(!current?.next||busyId)return;
    setBusyId(ticket.id);setError(null);
    try{
      await changeOrderStatus(tenantId,ticket.id,current.next);
      // Never assume a transition succeeded based solely on the button press.
      refresh();
    }catch(e){
      setError(e instanceof Error?e.message:"Não foi possível atualizar o pedido.");
      refresh();
    }finally{setBusyId(null);}
  }
  return <main className="content admin-content kitchen-page">
    <div className="section-heading"><div><span className="eyebrow">Operação Pro / Premium</span>
      <h1>Cozinha (KDS)</h1><p className="muted">Fila de preparo com atualização automática a cada 12 segundos enquanto a aba está visível.</p></div>
      <div className="actions"><Link className="button secondary" to={`/${slug}/painel`}>Voltar aos pedidos</Link>
        <button type="button" className="button secondary" onClick={refresh}>Atualizar agora</button></div>
    </div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    {loading&&!board&&<LoadingState label="Carregando fila da cozinha..." />}
    {board&&<>
      <p className="form-hint" role="status">Última atualização: {new Date(board.refreshedAt).toLocaleTimeString("pt-BR")}.
        {board.limited?" Mostrando os 100 pedidos mais antigos desta fila; encaminhe os prontos para liberar espaço.":""}</p>
      <div className="kitchen-columns">{columns.map(col=>{
        const tickets=board.tickets.filter(ticket=>ticket.status===col.status);
        return <section className="kitchen-column" key={col.status} aria-label={col.title}>
          <h2>{col.title} <span className="count-badge">{tickets.length}</span></h2>
          <div className="kitchen-column-cards">
            {tickets.length===0?<p className="form-hint">Nenhum pedido.</p>:
              tickets.map(ticket=><Ticket key={ticket.id} ticket={ticket} busy={busyId===ticket.id}
                onAdvance={t=>void advance(t)}/>)}
          </div>
        </section>;
      })}</div>
    </>}
  </main>;
}
export function TenantKitchenPage(){
  const {tenant,loading,error}=useTenant();
  if(loading)return <LoadingState label="Carregando sorveteria..." />;
  if(error||!tenant)return <ErrorState message={error??"Sorveteria indisponível."}/>;
  if(!canUseTenantFeature(tenant,"kds"))
    return <ErrorState message={featureAccessMessage(tenant,"kds")??"Cozinha indisponível para este plano."}/>;
  return <KitchenView key={tenant.id} tenantId={tenant.id} slug={tenant.slug}/>;
}

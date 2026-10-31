import {useEffect,useState,type FormEvent} from "react";
import type {DeliveryZone} from "@/domain/deliveryZones";
import {loadDeliveryZones,saveDeliveryZones} from "@/services/deliveryZonesService";
import {LoadingState} from "@/components/LoadingState";

const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export function DeliveryZonesManager({tenantId}:{tenantId:string}){
  const [zones,setZones]=useState<DeliveryZone[]>([]);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    loadDeliveryZones(tenantId).then(z=>{if(active){setZones(z);setError(null);}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível carregar zonas.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[tenantId]);
  function update(id:string,patch:Partial<DeliveryZone>){
    setZones(current=>current.map(z=>z.id===id?{...z,...patch}:z));
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setPending(true);setNotice(null);setError(null);
    try{
      await saveDeliveryZones(tenantId,zones);
      setNotice("Zonas de entrega salvas. Novos pedidos usarão as taxas atualizadas.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar as zonas.");}
    finally{setPending(false);}
  }
  if(loading)return <LoadingState label="Carregando zonas de entrega..."/>;
  return <section className="admin-section delivery-zones-section" aria-labelledby="delivery-zones-title">
    <div className="section-heading"><div><span className="eyebrow">Entrega Pro/Premium</span>
      <h2 id="delivery-zones-title">Zonas de entrega por bairro</h2></div>
      <span className="count-badge">{zones.length}/20</span>
    </div>
    <p className="muted">Cadastre bairros atendidos e a taxa correspondente. A comparação ignora acentos
      e diferenças de maiúsculas. Não há geolocalização automática: confirme o endereço antes de despachar.</p>
    <p className="form-hint">Sem zonas cadastradas, permanece a taxa única do checkout.
      Ao cadastrar zonas, pedidos para bairros não listados serão recusados.</p>
    <form onSubmit={event=>void submit(event)} className="form-grid">
      {zones.map((zone,index)=><fieldset className="delivery-zone-editor" key={zone.id}>
        <legend>Zona {index+1}</legend>
        <div className="form-row">
          <label>Nome da zona<input required maxLength={80} value={zone.name}
            onChange={e=>update(zone.id,{name:e.target.value})} placeholder="Ex.: Centro"/></label>
          <label>Taxa de entrega (R$)<input required type="number" min="0" max="1000" step="0.01"
            value={(zone.feeCents/100).toFixed(2)}
            onChange={e=>update(zone.id,{feeCents:Math.round(Number(e.target.value)*100)})}/></label>
        </div>
        <label>Bairros atendidos (um por linha)<textarea required rows={3}
          value={zone.neighborhoods.join("\n")} placeholder="Centro\nVila Nova"
          onChange={e=>update(zone.id,{neighborhoods:e.target.value.split("\n")})}/></label>
        <div className="actions"><span className="form-hint">Taxa atual: {money(zone.feeCents)}</span>
          <button type="button" className="button secondary" disabled={pending}
            onClick={()=>setZones(current=>current.filter(z=>z.id!==zone.id))}>Remover zona</button></div>
      </fieldset>)}
      <div className="actions">
        <button type="button" className="button secondary" disabled={pending||zones.length>=20}
          onClick={()=>setZones(current=>[...current,{id:crypto.randomUUID(),name:"",
            feeCents:0,neighborhoods:[""]}])}>Adicionar zona</button>
        <button type="submit" className="button primary" disabled={pending}>{pending?"Salvando...":"Salvar zonas"}</button>
      </div>
      {error&&<p className="error-text" role="alert">{error}</p>}
      {notice&&<p className="notice" role="status">{notice}</p>}
    </form>
  </section>;
}

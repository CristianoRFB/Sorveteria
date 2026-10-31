import {useEffect,useState,type FormEvent} from "react";
import {listTenantCoupons,saveTenantCoupon,type CouponInput,type TenantCoupon} from "@/services/couponsService";
import {LoadingState} from "@/components/LoadingState";

const empty:CouponInput={code:"",kind:"percent",value:10,minSubtotalCents:0,maxUses:null,active:true,expiresAt:null};
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
const couponInput=(c:TenantCoupon):CouponInput=>({code:c.code,kind:c.kind,value:c.value,
  minSubtotalCents:c.minSubtotalCents,maxUses:c.maxUses,active:c.active,expiresAt:c.expiresAt});
export function CouponsManager({tenantId}:{tenantId:string}){
  const [coupons,setCoupons]=useState<TenantCoupon[]>([]);
  const [draft,setDraft]=useState<CouponInput>({...empty});
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  async function refresh(){
    const response=await listTenantCoupons(tenantId);
    setCoupons(response);
  }
  useEffect(()=>{
    let alive=true;
    listTenantCoupons(tenantId).then(items=>{if(alive){setCoupons(items);setError(null);}})
      .catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível carregar cupons.");})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[tenantId]);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setPending(true);setError(null);setNotice(null);
    try{
      await saveTenantCoupon(tenantId,{...draft,code:draft.code.trim().toUpperCase()});
      await refresh();
      setDraft({...empty});setEditing(false);
      setNotice("Cupom salvo. As alterações se aplicam aos próximos pedidos.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar o cupom.");}
    finally{setPending(false);}
  }
  async function toggle(coupon:TenantCoupon){
    setPending(true);setError(null);setNotice(null);
    try{
      await saveTenantCoupon(tenantId,{...couponInput(coupon),active:!coupon.active});
      await refresh();setNotice(coupon.active?"Cupom desativado.":"Cupom reativado.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar o cupom.");}
    finally{setPending(false);}
  }
  if(loading)return <LoadingState label="Carregando cupons..."/>;
  return <section className="admin-section" aria-labelledby="coupons-heading">
    <div className="section-heading"><div><span className="eyebrow">Pro / Premium</span>
      <h2 id="coupons-heading">Cupons promocionais</h2></div>
      <span className="count-badge">{coupons.length}/100</span>
    </div>
    <p className="muted">Desconto percentual ou em reais sobre os produtos, sem reduzir o frete.
      Uma utilização é contabilizada no ato do pedido, mesmo antes do recebimento do pagamento.
      Cupons usados preservam suas regras financeiras, mas podem ser desativados.</p>
    {coupons.length>0&&<div className="coupon-list">{coupons.map(c=><article key={c.code} className="coupon-row">
      <div><strong>{c.code}</strong><span>{c.kind==="percent"?`${c.value}% de desconto`:`${money(c.value)} de desconto`}
        {" · Mínimo "}{money(c.minSubtotalCents)}{" · Uso "}{c.usedCount}/{c.maxUses??"ilimitado"}
        {c.expiresAt?" · Expira "+c.expiresAt:""}</span></div>
      <div className="actions"><span className={`status-pill ${c.active?"status-active":"status-cancelled"}`}>
        {c.active?"Ativo":"Inativo"}</span>
        <button type="button" className="button secondary" disabled={pending}
          onClick={()=>{setDraft(couponInput(c));setEditing(true);setError(null);setNotice(null);}}>
          Editar</button>
        <button type="button" className="button secondary" disabled={pending}
          onClick={()=>void toggle(c)}>{c.active?"Desativar":"Ativar"}</button></div>
    </article>)}</div>}
    <form className="form-grid coupon-editor" onSubmit={e=>void save(e)}>
      <h3>{editing?"Editar cupom":"Novo cupom"}</h3>
      <div className="form-row">
        <label>Código (5 a 24 caracteres)<input required minLength={5} maxLength={24}
          pattern="[A-Za-z0-9][A-Za-z0-9-]{3,22}[A-Za-z0-9]"
          disabled={editing} autoCapitalize="characters" value={draft.code}
          onChange={e=>setDraft(x=>({...x,code:e.target.value.toUpperCase()}))}
          placeholder="GELATO10"/></label>
        <label>Tipo<select value={draft.kind} onChange={e=>setDraft(x=>({...x,kind:e.target.value as CouponInput["kind"],value:10}))}
          disabled={editing&&coupons.some(c=>c.code===draft.code&&c.usedCount>0)}>
          <option value="percent">Percentual</option><option value="fixed">Valor fixo</option></select></label>
      </div>
      <div className="form-row">
        <label>{draft.kind==="percent"?"Desconto (%)":"Desconto (R$)"}
          <input required type="number" min={draft.kind==="percent"?1:0.01}
            max={draft.kind==="percent"?100:1000} step={draft.kind==="percent"?1:0.01}
            value={draft.kind==="percent"?draft.value:(draft.value/100).toFixed(2)}
            onChange={e=>setDraft(x=>({...x,value:draft.kind==="percent"?Number(e.target.value):
              Math.round(Number(e.target.value)*100)}))}/></label>
        <label>Pedido mínimo (R$)<input required type="number" min="0" max="10000" step="0.01"
          value={(draft.minSubtotalCents/100).toFixed(2)}
          onChange={e=>setDraft(x=>({...x,minSubtotalCents:Math.round(Number(e.target.value)*100)}))}/></label>
      </div>
      <div className="form-row">
        <label>Limite de utilizações (vazio = ilimitado)<input type="number" min="1" max="100000"
          value={draft.maxUses??""} onChange={e=>setDraft(x=>({...x,maxUses:e.target.value===""?null:Number(e.target.value)}))}/></label>
        <label>Último dia válido (opcional, UTC)<input type="date" value={draft.expiresAt??""}
          onChange={e=>setDraft(x=>({...x,expiresAt:e.target.value||null}))}/></label>
      </div>
      <label className="checkbox-label"><input type="checkbox" checked={draft.active}
        onChange={e=>setDraft(x=>({...x,active:e.target.checked}))}/>Cupom ativo</label>
      {error&&<p className="error-text" role="alert">{error}</p>}
      {notice&&<p className="notice" role="status">{notice}</p>}
      <div className="actions">
        <button type="submit" className="button primary" disabled={pending||(!editing&&coupons.length>=100)}>
          {pending?"Salvando...":editing?"Salvar alterações":"Criar cupom"}</button>
        {editing&&<button type="button" className="button secondary" disabled={pending}
          onClick={()=>{setDraft({...empty});setEditing(false);}}>Cancelar edição</button>}
      </div>
    </form>
  </section>;
}

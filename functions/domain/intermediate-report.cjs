"use strict";
/**
 * Read-only operational trends from a bounded, newest-first sample.
 * Period = rolling 24-hour windows; completed orders are those whose CURRENT
 * state is delivered/picked_up. Not settlement, payout, or accounting.
 */
const FINISHED=new Set(["delivered","picked_up"]);
const CANCELED="cancelled";
const LIMIT=500;
const cleanText=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
function timeMillis(value){
  if(value instanceof Date)return value.getTime();
  if(value&&typeof value.toMillis==="function")return value.toMillis();
  if(value&&Number.isFinite(value.seconds))return value.seconds*1000;
  return NaN;
}
function buildIntermediateReport({orders,days,startMs,endMs,truncated}){
  if(!Array.isArray(orders)||orders.length>LIMIT||![7,30].includes(days)
    ||!Number.isFinite(startMs)||!Number.isFinite(endMs)
    ||Math.abs(endMs-startMs-days*86400000)>1||typeof truncated!=="boolean")
    throw new TypeError("Invalid report scope");
  const buckets=Array.from({length:days},(_,i)=>({
    start:new Date(startMs+i*86400000).toISOString(),
    totalOrders:0,completedOrders:0,cancelledOrders:0,
    completedAmountCents:0,
  }));
  const fulfillment={pickup:{orders:0,completedOrders:0},delivery:{orders:0,completedOrders:0}};
  const products=new Map();
  let completedAmountCents=0,completedOrders=0,cancelledOrders=0;
  for(const o of orders){
    if(!o||typeof o!=="object"||!("createdAt" in o))continue;
    const ms=timeMillis(o.createdAt),idx=Math.floor((ms-startMs)/86400000);
    if(!Number.isFinite(ms)||idx<0||idx>=days)continue;
    const bucket=buckets[idx];
    bucket.totalOrders++;
    const done=FINISHED.has(o.status);
    if(o.status===CANCELED){bucket.cancelledOrders++;cancelledOrders++;}
    if(o.fulfillmentMode==="pickup"||o.fulfillmentMode==="delivery"){
      fulfillment[o.fulfillmentMode].orders++;
      if(done)fulfillment[o.fulfillmentMode].completedOrders++;
    }
    if(!done)continue;
    completedOrders++;bucket.completedOrders++;
    const total=o.money?.totalCents;
    if(Number.isSafeInteger(total)&&total>=0){
      bucket.completedAmountCents+=total;completedAmountCents+=total;
    }
    for(const line of Array.isArray(o.items)?o.items.slice(0,30):[]){
      if(!line||typeof line!=="object"
        ||typeof line.productId!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(line.productId)
        ||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>99)continue;
      const name=cleanText(line.name,120)||"Produto";
      const key=line.productId;
      const old=products.get(key)??{name,quantity:0,orders:0};
      old.quantity+=line.quantity;old.orders++;
      products.set(key,old);
    }
  }
  const topProducts=Array.from(products.values())
    .sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,"pt-BR"))
    .slice(0,10);
  return {days,periodStart:new Date(startMs).toISOString(),
    periodEnd:new Date(endMs).toISOString(),sampledOrders:orders.length,
    truncated,completedOrders,cancelledOrders,completedAmountCents,
    buckets,fulfillment,topProducts};
}
module.exports={LIMIT,buildIntermediateReport,timeMillis};

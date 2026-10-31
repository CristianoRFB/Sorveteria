"use strict";
/** Kitchen-only ticket projection: order content without customer, payment or delivery PII. */
const STATUSES=new Set(["received","confirmed","preparing","ready"]);
const safeText=(v,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const safeSelections=value=>{
  const result={};
  if(!value||typeof value!=="object"||Array.isArray(value))return result;
  for(const [key,choices] of Object.entries(value)){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(key)||["__proto__","constructor","prototype"].includes(key)
      ||!Array.isArray(choices))continue;
    result[key]=choices.filter(v=>typeof v==="string").slice(0,20)
      .map(v=>safeText(v,80));
  }
  return result;
};
function timeString(value){
  if(value&&typeof value.toDate==="function"){
    const date=value.toDate();
    return date instanceof Date&&!Number.isNaN(date.getTime())?date.toISOString():null;
  }
  if(value&&Number.isFinite(value.seconds)){
    const date=new Date(value.seconds*1000);
    return !Number.isNaN(date.getTime())?date.toISOString():null;
  }
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString();
  return null;
}
function projectKitchenTicket(id,tenantId,record){
  if(!record||record.tenantId!==tenantId||!STATUSES.has(record.status)
    ||typeof id!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(id)
    ||!/^SV-[A-HJ-NP-Z2-9]{8}$/.test(record.publicCode)
    ||!["pickup","delivery"].includes(record.fulfillmentMode)
    ||!Array.isArray(record.items)||record.items.length<1||record.items.length>100)return null;
  const items=record.items.map(item=>{
    if(!item||typeof item!=="object"||!safeText(item.name)
      ||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99)return null;
    return {name:safeText(item.name),quantity:item.quantity,selections:safeSelections(item.selections)};
  });
  if(items.some(x=>!x))return null;
  return {
    id,tenantId,publicCode:record.publicCode,status:record.status,
    fulfillmentMode:record.fulfillmentMode,createdAt:timeString(record.createdAt),
    items,
  };
}
module.exports={STATUSES,projectKitchenTicket};

"use strict";
const CODE=/^[A-Z0-9][A-Z0-9-]{3,22}[A-Z0-9]$/;
function normalizeCouponCode(value){
  if(value===undefined||value===null||value==="")return null;
  if(typeof value!=="string")throw new TypeError("Código de cupom inválido.");
  const code=value.trim().toUpperCase();
  if(!CODE.test(code))throw new TypeError("Use entre 5 e 24 caracteres: letras, números e hífen.");
  return code;
}
function validateCouponConfig(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)
    ||Object.keys(raw).some(key=>!["code","kind","value","minSubtotalCents","maxUses","active","expiresAt"].includes(key)))
    throw new TypeError("Dados de cupom inválidos.");
  const code=normalizeCouponCode(raw.code);
  if(!code || !["percent","fixed"].includes(raw.kind)
    ||!Number.isSafeInteger(raw.value)
    ||raw.value<1||(raw.kind==="percent"?raw.value>100:raw.value>100000)
    ||!Number.isSafeInteger(raw.minSubtotalCents)
    ||raw.minSubtotalCents<0||raw.minSubtotalCents>1000000
    ||(raw.maxUses!==null&&(!Number.isSafeInteger(raw.maxUses)||raw.maxUses<1||raw.maxUses>100000))
    ||typeof raw.active!=="boolean"
    ||(raw.expiresAt!==null&&(typeof raw.expiresAt!=="string"
      ||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw.expiresAt)
      ||Number.isNaN(Date.parse(raw.expiresAt+"T00:00:00Z"))
      ||new Date(raw.expiresAt+"T00:00:00Z").toISOString().slice(0,10)!==raw.expiresAt)))
    throw new TypeError("Regras de cupom inválidas.");
  return {code,kind:raw.kind,value:raw.value,
    minSubtotalCents:raw.minSubtotalCents,maxUses:raw.maxUses,
    active:raw.active,expiresAt:raw.expiresAt};
}
function calculateCouponDiscount(record,subtotalCents,nowMs=Date.now()){
  if(!record||typeof record!=="object"||record.active!==true
    ||!Number.isSafeInteger(subtotalCents)||subtotalCents<1
    ||!Number.isSafeInteger(record.usedCount)||record.usedCount<0
    ||!Number.isFinite(nowMs))return null;
  let coupon;
  try{coupon=validateCouponConfig(record);}catch{return null;}
  if(subtotalCents<coupon.minSubtotalCents
    ||(coupon.maxUses!==null&&record.usedCount>=coupon.maxUses)
    ||(coupon.expiresAt!==null&&nowMs>=Date.parse(coupon.expiresAt+"T00:00:00Z")+86400000))return null;
  const discount=Math.min(subtotalCents,coupon.kind==="percent"
    ?Math.round(subtotalCents*coupon.value/100):coupon.value);
  return discount>0?discount:null;
}
module.exports={normalizeCouponCode,validateCouponConfig,calculateCouponDiscount};

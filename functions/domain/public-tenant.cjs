"use strict";
/** Explicit public projections; never spread raw Firestore tenant or checkout documents. */
const featureAvailability=require("./feature-availability.json");
const flags=["onlineMenu","pickup","delivery","qrCodes","tableOrdering","kds","cashRegister","finance","coupons","inventory"];
const plans=new Set(["essencial","pro","premium"]);
const statuses=new Set(["trial","active","past_due","suspended","cancelled","demo"]);
const safeText=(v,max)=>typeof v==="string"?v.trim().slice(0,max):"";
const safeUrl=v=>typeof v==="string"&&v.length<=2048&&v.startsWith("https://")?v:undefined;
const safeColor=(v,fallback)=>typeof v==="string"&&/^#[a-f0-9]{6}$/i.test(v)?v:fallback;
function millis(v){
  if(v instanceof Date)return v.getTime();
  if(typeof v==="number")return v;
  if(v&&typeof v.toMillis==="function")return v.toMillis();
  if(v&&Number.isFinite(v.seconds))return v.seconds*1000;
  return NaN;
}
function projectPublicTenant(id,record){
  if(!record||record.status!=="active"||!/^[A-Za-z0-9_-]{1,128}$/.test(id)
    ||typeof record.slug!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)
    ||!safeText(record.branding?.displayName,120))return null;
  const b=record.branding;
  const features=Object.fromEntries(flags.map(name=>[name,record.features?.[name]===true]));
  const entitlementOverrides=Object.fromEntries(Object.keys(featureAvailability)
    .filter(name=>typeof record.entitlementOverrides?.[name]==="boolean")
    .map(name=>[name,record.entitlementOverrides[name]]));
  const trial=millis(record.trialUntil);
  return {
    id,slug:record.slug,status:"active",
    branding:{
      displayName:safeText(b.displayName,120),
      primaryColor:safeColor(b.primaryColor,"#6d28d9"),
      secondaryColor:safeColor(b.secondaryColor,"#f1e9ff"),
      backgroundColor:safeColor(b.backgroundColor,"#fffaf3"),
      textColor:safeColor(b.textColor,"#201a2a"),
      borderRadius:["sm","md","lg"].includes(b.borderRadius)?b.borderRadius:"md",
      ...(safeUrl(b.logoUrl)?{logoUrl:safeUrl(b.logoUrl)}:{}),
      ...(safeUrl(b.faviconUrl)?{faviconUrl:safeUrl(b.faviconUrl)}:{}),
    },
    contact:{
      address:safeText(record.contact?.address,240),
      phone:safeText(record.contact?.phone,40),
      whatsapp:safeText(record.contact?.whatsapp,40),
    },
    features,entitlementOverrides,
    planId:plans.has(record.planId)?record.planId:null,
    subscriptionStatus:statuses.has(record.subscriptionStatus)?record.subscriptionStatus:null,
    trialUntil:Number.isFinite(trial)?trial:null,
  };
}
function projectPublicCheckoutSettings(record){
  if(!record||typeof record!=="object"||!Number.isSafeInteger(record.deliveryFeeCents)
    ||record.deliveryFeeCents<0||record.deliveryFeeCents>100000
    ||!Number.isInteger(record.estimatedMinutes)
    ||record.estimatedMinutes<1||record.estimatedMinutes>600
    ||!Array.isArray(record.paymentMethods)||record.paymentMethods.length>8)return null;
  const paymentMethods=record.paymentMethods.filter(method=>
    method&&method.enabled===true&&typeof method.id==="string"
    &&/^[a-z0-9_-]{2,40}$/.test(method.id)&&typeof method.label==="string"
    &&method.label.trim().length>0&&method.label.length<=60
  ).map(method=>({id:method.id,label:safeText(method.label,60),
    instructions:safeText(method.instructions,500),enabled:true}));
  return {deliveryFeeCents:record.deliveryFeeCents,
    estimatedMinutes:record.estimatedMinutes,paymentMethods};
}
module.exports={projectPublicTenant,projectPublicCheckoutSettings};

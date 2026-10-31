"use strict";
const {normalizeCheckoutRequestId}=require("./checkout-idempotency.cjs");
const MAX_OPENING_CENTS=5000000;
const MAX_MOVEMENT_CENTS=1000000;
const MAX_COUNTED_CENTS=10000000;
function validCents(value,max,zeroAllowed=false){
  return Number.isSafeInteger(value)&&(zeroAllowed?value>=0:value>0)&&value<=max;
}
function normalizeCashRequestId(value){
  const id=normalizeCheckoutRequestId(value);
  if(!id)throw new TypeError("Identificador da operação do caixa obrigatório.");
  return id;
}
function validateCashOpening(input){
  if(!input||typeof input!=="object"||Array.isArray(input)
    ||Object.keys(input).some(key=>!["openingCents","requestId"].includes(key))
    ||!validCents(input.openingCents,MAX_OPENING_CENTS,true))
    throw new TypeError("Saldo inicial do caixa inválido.");
  return {openingCents:input.openingCents,requestId:normalizeCashRequestId(input.requestId)};
}
function validateCashMovement(input){
  if(!input||typeof input!=="object"||Array.isArray(input)
    ||Object.keys(input).some(key=>!["shiftId","requestId","kind","amountCents","note"].includes(key))
    ||!["inflow","outflow"].includes(input.kind)
    ||!validCents(input.amountCents,MAX_MOVEMENT_CENTS)
    ||typeof input.note!=="string"||input.note.trim().length<3||input.note.trim().length>160
    ||typeof input.shiftId!=="string"||!/^sh_[0-9a-f-]{36}$/.test(input.shiftId))
    throw new TypeError("Movimentação de caixa inválida.");
  return {shiftId:input.shiftId,requestId:normalizeCashRequestId(input.requestId),
    kind:input.kind,amountCents:input.amountCents,note:input.note.trim()};
}
function validateCashClosing(input){
  if(!input||typeof input!=="object"||Array.isArray(input)
    ||Object.keys(input).some(key=>!["shiftId","countedCents"].includes(key))
    ||typeof input.shiftId!=="string"||!/^sh_[0-9a-f-]{36}$/.test(input.shiftId)
    ||!validCents(input.countedCents,MAX_COUNTED_CENTS,true))
    throw new TypeError("Conferência de fechamento inválida.");
  return {shiftId:input.shiftId,countedCents:input.countedCents};
}
function nextCashBalance(current,kind,amount){
  if(!validCents(current,MAX_COUNTED_CENTS,true)||!validCents(amount,MAX_MOVEMENT_CENTS)
    ||!["inflow","outflow"].includes(kind))throw new TypeError("Saldo ou lançamento inválido.");
  const next=current+(kind==="inflow"?amount:-amount);
  if(!validCents(next,MAX_COUNTED_CENTS,true))return null;
  return next;
}
function iso(value){
  if(value&&typeof value.toDate==="function")return value.toDate().toISOString();
  if(value instanceof Date)return value.toISOString();
  return null;
}
function projectCashShift(id,record){
  if(!record||typeof id!=="string"||!/^sh_[0-9a-f-]{36}$/.test(id))return null;
  if(!["open","closed"].includes(record.status))return null;
  return {id,status:record.status,openingCents:record.openingCents,
    inflowCents:record.inflowCents,outflowCents:record.outflowCents,
    expectedCents:record.expectedCents,openedAt:iso(record.openedAt),
    closedAt:iso(record.closedAt),countedCents:record.countedCents??null,
    differenceCents:record.differenceCents??null};
}
function projectCashMovement(id,record){
  if(!record||!["inflow","outflow"].includes(record.kind))return null;
  return {id,kind:record.kind,amountCents:record.amountCents,
    note:typeof record.note==="string"?record.note.slice(0,160):"",
    createdAt:iso(record.createdAt)};
}
module.exports={MAX_OPENING_CENTS,MAX_MOVEMENT_CENTS,MAX_COUNTED_CENTS,
  validateCashOpening,validateCashMovement,validateCashClosing,nextCashBalance,
  projectCashShift,projectCashMovement};

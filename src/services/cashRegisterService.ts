import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase";
export type CashShift={id:string;status:"open"|"closed";openingCents:number;
  inflowCents:number;outflowCents:number;expectedCents:number;
  openedAt:string|null;closedAt:string|null;countedCents:number|null;differenceCents:number|null};
export type CashMovement={id:string;kind:"inflow"|"outflow";amountCents:number;
  note:string;createdAt:string|null};
export type CashSnapshot={activeShift:CashShift|null;movements:CashMovement[];
  recentShifts:CashShift[];refreshedAt:string};
type OpenResponse={shiftId:string;replayed:boolean};
type MovementResponse={shiftId:string;replayed:boolean;expectedCents:number|null};
type CloseResponse={shiftId:string;expectedCents:number;countedCents:number;differenceCents:number};
export async function loadCashRegister(tenantId:string):Promise<CashSnapshot>{
  const call=httpsCallable<{tenantId:string},CashSnapshot>(
    functions,"getTenantCashRegister",{timeout:20_000});
  return (await call({tenantId})).data;
}
export async function openCashShift(tenantId:string,openingCents:number,requestId:string):Promise<OpenResponse>{
  const call=httpsCallable<{tenantId:string;openingCents:number;requestId:string},OpenResponse>(
    functions,"openTenantCashShift",{timeout:20_000});
  return (await call({tenantId,openingCents,requestId})).data;
}
export async function recordCashMovement(input:{tenantId:string;shiftId:string;requestId:string;
  kind:"inflow"|"outflow";amountCents:number;note:string}):Promise<MovementResponse>{
  const call=httpsCallable<typeof input,MovementResponse>(
    functions,"recordTenantCashMovement",{timeout:20_000});
  return (await call(input)).data;
}
export async function closeCashShift(tenantId:string,shiftId:string,countedCents:number):Promise<CloseResponse>{
  const call=httpsCallable<{tenantId:string;shiftId:string;countedCents:number},CloseResponse>(
    functions,"closeTenantCashShift",{timeout:20_000});
  return (await call({tenantId,shiftId,countedCents})).data;
}

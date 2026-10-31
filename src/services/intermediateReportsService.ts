import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase";
export type IntermediateReport={
  days:7|30;periodStart:string;periodEnd:string;sampledOrders:number;
  truncated:boolean;completedOrders:number;cancelledOrders:number;
  completedAmountCents:number;
  buckets:Array<{start:string;totalOrders:number;completedOrders:number;
    cancelledOrders:number;completedAmountCents:number}>;
  fulfillment:{pickup:{orders:number;completedOrders:number};
    delivery:{orders:number;completedOrders:number}};
  topProducts:Array<{name:string;quantity:number;orders:number}>;
};
export async function loadIntermediateReport(tenantId:string,days:7|30):Promise<IntermediateReport>{
  const call=httpsCallable<{tenantId:string;days:7|30},IntermediateReport>(
    functions,"getTenantIntermediateReport",{timeout:30_000});
  return (await call({tenantId,days})).data;
}

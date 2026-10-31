import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type BasicSalesSummary={
  days:7|30;
  periodStart:string;
  periodEnd:string;
  totalOrders:number;
  completedOrders:number;
  cancelledOrders:number;
  pendingOrders:number;
  completedAmountCents:number;
  averageCompletedTicketCents:number;
};

export async function loadBasicSalesSummary(tenantId:string,days:7|30):Promise<BasicSalesSummary>{
  const call=httpsCallable<{tenantId:string;days:7|30},BasicSalesSummary>(
    functions,"getTenantSalesSummary",{timeout:30_000},
  );
  return (await call({tenantId,days})).data;
}

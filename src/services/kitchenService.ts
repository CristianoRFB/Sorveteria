import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
export type KitchenStatus="received"|"confirmed"|"preparing"|"ready";
export type KitchenTicket={
  id:string;tenantId:string;publicCode:string;status:KitchenStatus;
  fulfillmentMode:"pickup"|"delivery";createdAt:string|null;
  items:Array<{name:string;quantity:number;selections:Record<string,string[]>}>;
};
export type KitchenBoard={tickets:KitchenTicket[];limited:boolean;refreshedAt:string};
export async function loadKitchenBoard(tenantId:string):Promise<KitchenBoard>{
  const callable=httpsCallable<{tenantId:string},KitchenBoard>(functions,"getTenantKitchenBoard",{timeout:20_000});
  return (await callable({tenantId})).data;
}

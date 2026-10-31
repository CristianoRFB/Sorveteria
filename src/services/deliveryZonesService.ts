import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { DeliveryZone } from "@/domain/deliveryZones";

export async function loadDeliveryZones(tenantId:string):Promise<DeliveryZone[]>{
  const fn=httpsCallable<{tenantId:string},{zones:DeliveryZone[]}>(
    functions,"getTenantDeliveryZones",{timeout:20_000});
  return (await fn({tenantId})).data.zones;
}
export async function saveDeliveryZones(tenantId:string,zones:DeliveryZone[]):Promise<void>{
  const fn=httpsCallable<{tenantId:string;zones:DeliveryZone[]},{success:boolean}>(
    functions,"updateTenantDeliveryZones",{timeout:20_000});
  await fn({tenantId,zones});
}

import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase";
export type TenantCoupon={
  code:string;kind:"percent"|"fixed";value:number;minSubtotalCents:number;
  maxUses:number|null;usedCount:number;active:boolean;expiresAt:string|null;
};
export type CouponInput=Omit<TenantCoupon,"usedCount">;
export async function listTenantCoupons(tenantId:string):Promise<TenantCoupon[]>{
  const fn=httpsCallable<{tenantId:string},{coupons:TenantCoupon[]}>(
    functions,"getTenantCoupons",{timeout:20_000});
  return (await fn({tenantId})).data.coupons;
}
export async function saveTenantCoupon(tenantId:string,coupon:CouponInput):Promise<void>{
  const fn=httpsCallable<{tenantId:string;coupon:CouponInput},{success:boolean}>(
    functions,"upsertTenantCoupon",{timeout:20_000});
  await fn({tenantId,coupon});
}

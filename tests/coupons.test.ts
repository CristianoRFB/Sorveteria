import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
const require=createRequire(import.meta.url);
const {normalizeCouponCode,validateCouponConfig,calculateCouponDiscount}=require("../functions/domain/coupons.cjs");
const {checkoutFingerprint}=require("../functions/domain/checkout-idempotency.cjs");
const {evaluateFeature,planCatalog}=require("../functions/domain/entitlements.cjs");
const config={code:"SORVETE10",kind:"percent",value:10,minSubtotalCents:1000,
  maxUses:3,active:true,expiresAt:null};
const record={...config,usedCount:0,createdAt:new Date(),internalSecret:"NO_LEAK"};
describe("coupon validation, checkout fingerprint and redemption boundaries",()=>{
  it("canonicalizes valid codes and blocks malformed or empty manager codes",()=>{
    expect(normalizeCouponCode(" sorvete10 ")).toBe("SORVETE10");
    expect(normalizeCouponCode("")).toBeNull();
    for(const bad of ["../NO","A","<script>","CO DE","A".repeat(25),12])
      expect(()=>normalizeCouponCode(bad)).toThrow();
    expect(validateCouponConfig({...config,code:"sorvete10"}).code).toBe("SORVETE10");
  });
  it("calculates percentage and fixed discounts only on subtotal and never above it",()=>{
    expect(calculateCouponDiscount(record,2500)).toBe(250);
    expect(calculateCouponDiscount({...record,kind:"fixed",value:3000},2500)).toBe(2500);
    expect(calculateCouponDiscount({...record,kind:"percent",value:100},2500)).toBe(2500);
    expect(calculateCouponDiscount(record,999)).toBeNull();
    expect(calculateCouponDiscount(record,1005)).toBe(101);
  });
  it("rejects exhausted, inactive and expired coupons, including date end-of-day UTC",()=>{
    expect(calculateCouponDiscount({...record,usedCount:3},3000)).toBeNull();
    expect(calculateCouponDiscount({...record,active:false},3000)).toBeNull();
    const dated={...record,expiresAt:"2026-10-31"};
    expect(calculateCouponDiscount(dated,3000,Date.parse("2026-10-31T23:59:59Z"))).toBe(300);
    expect(calculateCouponDiscount(dated,3000,Date.parse("2026-11-01T00:00:00Z"))).toBeNull();
    expect(calculateCouponDiscount({...record,usedCount:-1},3000)).toBeNull();
  });
  it("rejects invalid financial and policy terms including corrupted persisted terms",()=>{
    for(const bad of [
      {...config,kind:"arbitrary"},{...config,value:101},
      {...config,kind:"fixed",value:0},{...config,minSubtotalCents:-1},
      {...config,maxUses:-1},{...config,active:"true"},
      {...config,expiresAt:"2026-02-31"},{...config,expiresAt:"tomorrow"},
      {...config,foo:"private"},
    ])expect(()=>validateCouponConfig(bad)).toThrow();
    expect(calculateCouponDiscount({...record,value:200},2000)).toBeNull();
  });
  it("preserves old idempotency fingerprints while binding coupon changes to new attempts",()=>{
    const order={tenantId:"tenant-alpha",fulfillmentMode:"pickup",
      customer:{name:"Teste",phone:"111"},paymentMethodId:"cash",
      items:[{productId:"pot",quantity:1,selections:{}}]};
    expect(checkoutFingerprint(order)).toBe(checkoutFingerprint({...order,couponCode:null}));
    expect(checkoutFingerprint({...order,couponCode:"SORVETE10"}))
      .not.toBe(checkoutFingerprint(order));
    expect(checkoutFingerprint({...order,couponCode:"SORVETE10"}))
      .not.toBe(checkoutFingerprint({...order,couponCode:"SORVETE20"}));
    expect(()=>checkoutFingerprint({...order,couponCode:"<script>"})).toThrow();
  });
  it("enables coupons only for Pro and Premium unless a valid explicit override grants access",()=>{
    expect(planCatalog.plans.essencial.features).not.toContain("coupons");
    for(const planId of ["pro","premium"])
      expect(evaluateFeature({status:"active",planId,subscriptionStatus:"active"},"coupons").allowed).toBe(true);
    expect(evaluateFeature({status:"active",planId:"essencial",subscriptionStatus:"active"},"coupons").allowed).toBe(false);
    expect(evaluateFeature({status:"active",planId:"pro",subscriptionStatus:"active",
      entitlementOverrides:{coupons:false}},"coupons").allowed).toBe(false);
  });
});

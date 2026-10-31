import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
const require=createRequire(import.meta.url);
const {buildBasicSalesSummary}=require("../functions/domain/sales-summary.cjs");
const {evaluateFeature,planCatalog}=require("../functions/domain/entitlements.cjs");
describe("basic sales summary mathematics and feature gating",()=>{
  it("computes completed order value without cancelled or pending orders",()=>{
    expect(buildBasicSalesSummary({orderCount:6,completedCount:2,cancelledCount:1,completedAmountCents:3501}))
      .toEqual({totalOrders:6,completedOrders:2,cancelledOrders:1,pendingOrders:3,
        completedAmountCents:3501,averageCompletedTicketCents:1751});
  });
  it("produces zeros with no completed orders or any orders",()=>{
    expect(buildBasicSalesSummary({orderCount:0,completedCount:0,cancelledCount:0,completedAmountCents:0}))
      .toEqual({totalOrders:0,completedOrders:0,cancelledOrders:0,pendingOrders:0,
        completedAmountCents:0,averageCompletedTicketCents:0});
  });
  it("rejects negative, inconsistent or non-integer aggregate values",()=>{
    for(const args of [
      {orderCount:3,completedCount:2,cancelledCount:2,completedAmountCents:1000},
      {orderCount:-1,completedCount:0,cancelledCount:0,completedAmountCents:0},
      {orderCount:1,completedCount:1,cancelledCount:0,completedAmountCents:NaN},
      {orderCount:1,completedCount:1,cancelledCount:0,completedAmountCents:1.1},
      {orderCount:Number.MAX_SAFE_INTEGER+1,completedCount:0,cancelledCount:0,completedAmountCents:0},
    ])expect(()=>buildBasicSalesSummary(args)).toThrow("Invalid aggregate results");
  });
  it("makes feature available in all commercially approved plan tiers",()=>{
    for(const planId of Object.keys(planCatalog.plans)){
      expect(planCatalog.plans[planId].features).toContain("basic_sales_summary");
      expect(evaluateFeature({status:"active",planId,subscriptionStatus:"active",
        entitlementOverrides:{}},"basic_sales_summary")).toMatchObject({allowed:true,reason:null});
    }
  });
  it("denies unassigned subscriptions and feature overrides",()=>{
    const tenant={status:"active",planId:"essencial",subscriptionStatus:"active"};
    expect(evaluateFeature({...tenant,entitlementOverrides:{basic_sales_summary:false}},"basic_sales_summary").allowed).toBe(false);
    expect(evaluateFeature({...tenant,planId:null},"basic_sales_summary").allowed).toBe(false);
    expect(evaluateFeature({...tenant,status:"suspended"},"basic_sales_summary").allowed).toBe(false);
  });
});

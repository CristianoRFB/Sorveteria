import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
const require=createRequire(import.meta.url);
const {LIMIT,buildIntermediateReport}=require("../functions/domain/intermediate-report.cjs");
const {evaluateFeature}=require("../functions/domain/entitlements.cjs");
const start=Date.parse("2026-10-01T00:00:00.000Z"),end=start+7*86400000;
const doc=(day:number,status:string,more:Record<string,unknown>={})=>({
  createdAt:{seconds:Math.floor((start+day*86400000+3600000)/1000)},
  status,fulfillmentMode:"pickup",money:{totalCents:2400},
  items:[{productId:"pot",name:"Gelato",quantity:2}],...more,
});
const report=(orders:unknown[],truncated=false)=>
  buildIntermediateReport({orders,days:7,startMs:start,endMs:end,truncated});
describe("PII-free operational reporting aggregation",()=>{
  it("builds time buckets, fulfillment and top-products from completed orders only",()=>{
    const r=report([doc(0,"delivered"),doc(1,"picked_up",{fulfillmentMode:"delivery"}),
      doc(1,"cancelled"),doc(5,"received")]);
    expect(r.buckets).toHaveLength(7);
    expect(r.buckets[0]).toMatchObject({totalOrders:1,completedOrders:1,completedAmountCents:2400});
    expect(r.buckets[1]).toMatchObject({totalOrders:2,completedOrders:1,cancelledOrders:1});
    expect(r).toMatchObject({sampledOrders:4,completedOrders:2,cancelledOrders:1,
      completedAmountCents:4800,topProducts:[{name:"Gelato",quantity:4,orders:2}],
      fulfillment:{pickup:{orders:3,completedOrders:1},delivery:{orders:1,completedOrders:1}}});
  });
  it("uses only safe allowlisted metrics, never emits customer or payment data",()=>{
    const r=report([doc(0,"delivered",{
      customer:{name:"SUPER_SECRET_NAME",phone:"SECRET_PHONE"},
      address:{street:"SECRET_STREET"},paymentMethod:"SECRET_CARD",
    })]);
    expect(JSON.stringify(r)).not.toMatch(/SECRET|customer|phone|address|paymentMethod|productId/);
  });
  it("sorts top products by quantity, enforces top 10 and ignores invalid lines",()=>{
    const items=Array.from({length:14},(_,i)=>({
      productId:"prod"+i,name:"Item "+i,quantity:i+1,
    }));
    const r=report([doc(0,"picked_up",{items:[...items,{productId:"../../bad",quantity:999,name:"bad"}]})]);
    expect(r.topProducts).toHaveLength(10);
    expect(r.topProducts[0].quantity).toBe(14);
    expect(r.topProducts.every((x:{quantity:number})=>x.quantity<=14)).toBe(true);
  });
  it("reports exact bounded coverage without claiming that a partial sample is exhaustive",()=>{
    const r=report([doc(0,"received")],true);
    expect(r.truncated).toBe(true);expect(r.sampledOrders).toBe(1);
    expect(LIMIT).toBe(500);
    expect(()=>report(Array.from({length:501},()=>doc(0,"received")))).toThrow();
  });
  it("rejects invalid scope and missing timestamps",()=>{
    expect(()=>buildIntermediateReport({orders:[],days:365,startMs:start,endMs:end,truncated:false})).toThrow();
    expect(()=>report(null as unknown[])).toThrow();
    expect(report([doc(-2,"delivered"),doc(9,"delivered"),{status:"delivered"}]).completedOrders).toBe(0);
  });
  it("obeys Pro/Premium entitlements and explicit overrides",()=>{
    for(const planId of ["pro","premium"])
      expect(evaluateFeature({status:"active",planId,subscriptionStatus:"active"},"intermediate_reports").allowed).toBe(true);
    expect(evaluateFeature({status:"active",planId:"essencial",subscriptionStatus:"active"},"intermediate_reports").allowed).toBe(false);
    expect(evaluateFeature({status:"active",planId:"pro",subscriptionStatus:"active",
      entitlementOverrides:{intermediate_reports:false}},"intermediate_reports").allowed).toBe(false);
  });
});

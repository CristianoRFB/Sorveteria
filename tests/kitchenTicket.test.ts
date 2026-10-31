import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
const require=createRequire(import.meta.url);
const {projectKitchenTicket}=require("../functions/domain/kitchen-ticket.cjs");
const {evaluateFeature,planCatalog}=require("../functions/domain/entitlements.cjs");
const code="SV-ABCDEFG2";
const fixture=()=>({
  tenantId:"tenant-alpha",publicCode:code,status:"preparing",fulfillmentMode:"delivery",
  createdAt:{seconds:1700000000,nanoseconds:0},customer:{name:"DO_NOT_LEAK",phone:"DO_NOT_LEAK"},
  paymentMethodId:"DO_NOT_LEAK",address:{street:"DO_NOT_LEAK"},deliveryCodeHash:"DO_NOT_LEAK",
  items:[{name:"Gelato",quantity:2,selections:{flavors:["chocolate"],toppings:["nuts"]},
    unitPriceCents:1200,recipeCosts:{secret:"DO_NOT_LEAK"}}],
});
describe("KDS ticket privacy projection",()=>{
  it("returns only order identity, prep status, item names/options and timestamps",()=>{
    const ticket=projectKitchenTicket("order-a","tenant-alpha",fixture());
    expect(ticket).toEqual({id:"order-a",tenantId:"tenant-alpha",publicCode:code,
      status:"preparing",fulfillmentMode:"delivery",createdAt:"2023-11-14T22:13:20.000Z",
      items:[{name:"Gelato",quantity:2,selections:{flavors:["chocolate"],toppings:["nuts"]}}]});
    expect(JSON.stringify(ticket)).not.toMatch(/DO_NOT_LEAK|address|phone|payment|unitPrice|recipeCosts/);
  });
  it("rejects cross-tenant, finished, and invalid tickets",()=>{
    expect(projectKitchenTicket("order-a","tenant-beta",fixture())).toBeNull();
    expect(projectKitchenTicket("order-a","tenant-alpha",{...fixture(),status:"delivered"})).toBeNull();
    expect(projectKitchenTicket("../order","tenant-alpha",fixture())).toBeNull();
    expect(projectKitchenTicket("order-a","tenant-alpha",{...fixture(),publicCode:"bad"})).toBeNull();
    expect(projectKitchenTicket("order-a","tenant-alpha",{...fixture(),items:[]})).toBeNull();
  });
  it("drops malicious selection keys and guards quantity validation",()=>{
    const record=fixture();
    record.items[0].selections=JSON.parse('{"__proto__":["secret"],"constructor":["private"],"flavors":["chocolate"]}');
    const result=projectKitchenTicket("order-a","tenant-alpha",record);
    expect(result?.items[0].selections).toEqual({flavors:["chocolate"]});
    expect(projectKitchenTicket("order-a","tenant-alpha",{...fixture(),items:[{name:"Gelato",quantity:-1}]})).toBeNull();
  });
});
describe("KDS entitlement boundaries",()=>{
  it("is available only in approved Pro and Premium tiers",()=>{
    expect(planCatalog.plans.essencial.features).not.toContain("kds");
    for(const planId of ["pro","premium"]){
      expect(planCatalog.plans[planId].features).toContain("kds");
      expect(evaluateFeature({status:"active",planId,subscriptionStatus:"active"},"kds").allowed).toBe(true);
    }
    expect(evaluateFeature({status:"active",planId:"essencial",subscriptionStatus:"active"},"kds").allowed).toBe(false);
  });
  it("honors explicit overrides and inactive state without bypassing readiness",()=>{
    expect(evaluateFeature({status:"active",planId:"pro",subscriptionStatus:"active",
      entitlementOverrides:{kds:false}},"kds").allowed).toBe(false);
    expect(evaluateFeature({status:"suspended",planId:"pro",subscriptionStatus:"active"},"kds").allowed).toBe(false);
  });
});

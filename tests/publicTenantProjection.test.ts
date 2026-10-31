import {describe,expect,it} from "vitest";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {projectPublicTenant,projectPublicCheckoutSettings}=require("../functions/domain/public-tenant.cjs");
const tenant={
  slug:"tenant-alpha",status:"active",
  branding:{displayName:"Alpha",primaryColor:"#aabbcc",secondaryColor:"#ffffff",
    backgroundColor:"#000000",textColor:"#111111",borderRadius:"lg",secret:"LEAK"},
  features:{onlineMenu:true,pickup:true,delivery:false,secretFlag:"LEAK"},
  contact:{address:"Rua teste",phone:"11999999999",secret:"LEAK"},
  planId:"pro",subscriptionStatus:"trial",
  trialUntil:{toMillis:()=>1_800_000_000_000},
  entitlementOverrides:{checkout:true,secretFeature:"LEAK"},
  limitOverrides:{driversActive:500},
  commercialAssignedBy:"LEAK",internalNotes:"LEAK",
};
describe("public tenant privacy projection",()=>{
  it("returns only public branding, flags and feature gate fields",()=>{
    const result=projectPublicTenant("tenant-alpha",tenant);
    expect(result).toMatchObject({id:"tenant-alpha",slug:"tenant-alpha",
      branding:{displayName:"Alpha"},features:{onlineMenu:true,delivery:false},
      contact:{address:"Rua teste"},planId:"pro",subscriptionStatus:"trial",
      trialUntil:1_800_000_000_000,entitlementOverrides:{checkout:true}});
    expect(JSON.stringify(result)).not.toMatch(/LEAK|limitOverrides|commercialAssignedBy|internalNotes/);
  });
  it("returns null for suspended or malformed tenants",()=>{
    expect(projectPublicTenant("tenant-alpha",{...tenant,status:"suspended"})).toBeNull();
    expect(projectPublicTenant("../alpha",tenant)).toBeNull();
    expect(projectPublicTenant("tenant-alpha",{...tenant,branding:{}})).toBeNull();
  });
  it("fails closed for unknown commercial fields and unsafe logo/color",()=>{
    const result=projectPublicTenant("tenant-alpha",{...tenant,planId:"constructor",
      subscriptionStatus:"unknown",trialUntil:"invalid",
      branding:{...tenant.branding,logoUrl:"javascript:alert(1)",primaryColor:"bad"}});
    expect(result).toMatchObject({planId:null,subscriptionStatus:null,trialUntil:null});
    expect(result.branding.logoUrl).toBeUndefined();
    expect(result.branding.primaryColor).toBe("#6d28d9");
  });
});
describe("public checkout settings projection",()=>{
  it("returns only enabled methods and safe payment fields",()=>{
    const result=projectPublicCheckoutSettings({deliveryFeeCents:500,estimatedMinutes:35,secret:"LEAK",
      paymentMethods:[{id:"cash",label:"Dinheiro",instructions:"Na entrega",enabled:true,secret:"LEAK"},
        {id:"disabled",label:"Desativado",enabled:false},{id:"bad/id",label:"Invalido",enabled:true}]});
    expect(result).toEqual({deliveryFeeCents:500,estimatedMinutes:35,
      paymentMethods:[{id:"cash",label:"Dinheiro",instructions:"Na entrega",enabled:true}]});
    expect(JSON.stringify(result)).not.toMatch(/LEAK|Desativado/);
  });
  it("rejects invalid fee, minute or payment settings",()=>{
    expect(projectPublicCheckoutSettings({deliveryFeeCents:-1,estimatedMinutes:30,paymentMethods:[]})).toBeNull();
    expect(projectPublicCheckoutSettings({deliveryFeeCents:0,estimatedMinutes:NaN,paymentMethods:[]})).toBeNull();
  });
});

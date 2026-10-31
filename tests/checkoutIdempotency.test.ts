import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {normalizeCheckoutRequestId,checkoutDocumentId,checkoutFingerprint,replayCheckout}=require("../functions/domain/checkout-idempotency.cjs");
const uuid="aa8de576-3125-4f87-a013-c9300fb18e7c";
const payload={tenantId:"tenant-alpha",fulfillmentMode:"delivery",customer:{name:"Teste",phone:"0000000000"},address:{street:"Rua",number:"1",neighborhood:"Centro"},paymentMethodId:"cash",items:[{productId:"p",quantity:1,selections:{flavors:["vanilla"]}}]};
describe("checkout idempotency boundary",()=>{
  it("requires UUID v4 and isolates tenants, not Auth session",()=>{
    expect(normalizeCheckoutRequestId(uuid.toUpperCase())).toBe(uuid);
    expect(normalizeCheckoutRequestId(undefined)).toBeNull();
    for (const bad of ["x","../a",{},12]) expect(()=>normalizeCheckoutRequestId(bad)).toThrow();
    expect(checkoutDocumentId("alpha","user-1",uuid)).toBe(checkoutDocumentId("alpha","user-2",uuid));
    expect(checkoutDocumentId("alpha",null,uuid)).not.toBe(checkoutDocumentId("beta",null,uuid));
  });
  it("canonicalizes object keys and detects changed values",()=>{
    const reordered={...payload,customer:{phone:"0000000000",name:"Teste"},items:[{selections:{flavors:["vanilla"]},quantity:1,productId:"p"}]};
    expect(checkoutFingerprint(reordered)).toBe(checkoutFingerprint(payload));
    expect(checkoutFingerprint({...payload,customer:{name:"Teste",phone:"1"}})).not.toBe(checkoutFingerprint(payload));
  });
  it("rejects nested input and unexpected types",()=>{
    expect(()=>checkoutFingerprint({...payload,items:[null]})).toThrow();
    expect(()=>checkoutFingerprint({...payload,items:[{productId:"p",quantity:1,selections:{x:[[123]]}}]})).toThrow();
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(()=>checkoutFingerprint({...payload,address:{street:"Rua",number:"1",neighborhood:cyclic}})).toThrow();
    expect(checkoutFingerprint({...payload,fulfillmentMode:"pickup",address:cyclic})).toBe(checkoutFingerprint({...payload,fulfillmentMode:"pickup",address:null}));
  });
  it("never leaks delivery code on replay",()=>{
    const fingerprint=checkoutFingerprint(payload);
    expect(replayCheckout({fingerprint,orderId:"order1",publicCode:"SV-ABCDE234"},fingerprint))
      .toEqual({orderId:"order1",publicCode:"SV-ABCDE234",deliveryCode:null,replayed:true});
    expect(()=>replayCheckout({fingerprint,orderId:"order1",publicCode:"SV-ABCDE234"},"mismatch")).toThrow();
  });
});

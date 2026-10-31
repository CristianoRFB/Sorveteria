import {describe,expect,it} from "vitest";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {projectAdminOrder}=require("../functions/domain/admin-order-projection.cjs");
const sample={
  tenantId:"tenant-beta",publicCode:"SV-ABCDEFGH",status:"received",fulfillmentMode:"delivery",
  customer:{name:"Ana",phone:"11999999999",secretToken:"LEAK_CUSTOMER"},
  address:{street:"Rua 1",number:"14",neighborhood:"Centro",reference:"Portão azul",gpsPrivate:"LEAK_ADDRESS"},
  source:{channel:"web",internalSession:"LEAK_SOURCE"},
  items:[{productId:"pot-classic",name:"Sorvete",quantity:1,unitPriceCents:1200,lineTotalCents:1200,
    selections:{flavors:["chocolate"]},internalMargin:"LEAK_ITEM"}],
  money:{subtotalCents:1200,deliveryFeeCents:500,discountCents:0,totalCents:1700,bankSecret:"LEAK_MONEY"},
  paymentMethodId:"cash",estimatedMinutes:35,deliveryCodeHash:"LEAK_CODE",
  auditLog:"LEAK_AUDIT",internalNotes:"LEAK_NOTES",
};
describe("tenant operational order projection",()=>{
  it("returns only UI fields without spreading nested private data",()=>{
    const d=projectAdminOrder("order-1","tenant-alpha",sample);
    expect(d).toMatchObject({id:"order-1",tenantId:"tenant-alpha",status:"received",
      customer:{name:"Ana",phone:"11999999999"},address:{street:"Rua 1",number:"14",neighborhood:"Centro",reference:"Portão azul"},
      items:[{productId:"pot-classic",name:"Sorvete",quantity:1,unitPriceCents:1200,lineTotalCents:1200}],
      money:{totalCents:1700}});
    expect(JSON.stringify(d)).not.toMatch(/LEAK_|deliveryCodeHash|internalNotes|auditLog/);
    expect(Object.keys(d.customer)).toEqual(["name","phone"]);
    expect(Object.keys(d.items[0])).toEqual(["productId","name","quantity","selections","unitPriceCents","lineTotalCents"]);
  });
  it("enforces the queried tenantId rather than trusting document tenantId",()=>{
    expect(projectAdminOrder("id","tenant-alpha",sample).tenantId).toBe("tenant-alpha");
  });
  it("handles invalid optional fields without exposing prototype pollution keys",()=>{
    const result=projectAdminOrder("id","tenant-alpha",{items:[{
      selections:JSON.parse('{"__proto__":["secret"],"flavors":["a","b"],"extra":"hidden"}'),
      productId:"pot-classic",quantity:1,
    }]});
    expect(result.items[0].selections.flavors).toEqual(["a","b"]);
    expect(Object.hasOwn(result.items[0].selections,"__proto__")).toBe(false);
    expect(result.customer).toEqual({name:"",phone:""});
    expect(result.money.totalCents).toBe(0);
  });
  it("bounds large malformed item arrays",()=>{
    const x=projectAdminOrder("id","tenant-alpha",{items:Array.from({length:150},()=>({name:"x"}))});
    expect(x.items).toHaveLength(100);
  });
});

import {describe,expect,it} from "vitest";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {projectPublicCatalog}=require("../functions/domain/public-catalog.cjs");
const cat=(id:string,active:boolean)=>({id,data:{name:id,sortOrder:0,active,private:"DO_NOT_LEAK"}});
const item=(id:string,categoryId:string,available:boolean)=>({id,data:{name:"Gelato",description:"Gelato",categoryId,
  kind:"pot",priceCents:1000,available,imageUrl:"javascript:alert(1)",private:"DO_NOT_LEAK",
  optionGroups:[{id:"size",name:"Tamanho",minSelections:1,maxSelections:1,required:true,
    options:[{id:"small",name:"Pequeno",priceDeltaCents:0,available:true,private:"DO_NOT_LEAK"}]}]}});
describe("public catalogue allowlist",()=>{
  it("hides inactive categories and their products",()=>{
    const x=projectPublicCatalog([cat("active",true),cat("hidden",false)],[
      item("a","active",true),item("b","hidden",true),item("c","active",false)]);
    expect(x.products.map((p:{id:string})=>p.id)).toEqual(["a"]);
    expect(x.categories.map((p:{id:string})=>p.id)).toEqual(["active"]);
  });
  it("does not leak private fields or unsafe image URLs",()=>{
    const x=projectPublicCatalog([cat("active",true)],[item("a","active",true)]);
    expect(JSON.stringify(x)).not.toMatch(/DO_NOT_LEAK|javascript:/);
    expect(x.products[0].optionGroups[0].options[0]).toEqual({id:"small",name:"Pequeno",priceDeltaCents:0,available:true});
  });
  it("keeps an HTTPS product photo URL without leaking non-public product fields",()=>{
    const product=item("a","active",true);
    product.data.imageUrl="https://cdn.example.com/sorvetes/gelato.webp";
    const result=projectPublicCatalog([cat("active",true)],[product]);
    expect(result.products[0].imageUrl).toBe(product.data.imageUrl);
    expect(JSON.stringify(result)).not.toContain("DO_NOT_LEAK");
  });
  it("rejects invalid product data instead of exposing it",()=>{
    const bad=item("bad","active",true);bad.data.priceCents=Number.NaN;
    expect(projectPublicCatalog([cat("active",true)],[bad]).products).toEqual([]);
  });
});

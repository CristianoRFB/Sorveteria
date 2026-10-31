import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
import {deliveryQuote as clientQuote,neighborhoodKey as clientKey} from "@/domain/deliveryZones";
const require=createRequire(import.meta.url);
const {validateDeliveryZones,quoteDeliveryZone,neighborhoodKey}=require("../functions/domain/delivery-zones.cjs");
const zones=[{id:"centro",name:"Centro",feeCents:750,neighborhoods:["Centro","Jardim São José"]},
  {id:"periferia",name:"Mais distante",feeCents:1250,neighborhoods:["Vila Verde"]}];
describe("server-authoritative neighborhood delivery zone pricing",()=>{
  it("normalizes accents, punctuation, case and whitespace consistently with frontend",()=>{
    for(const s of ["JARDIM SÃO JOSÉ","Jardim São    José","jardim sao jose","jardim-sao-jose"]){
      expect(neighborhoodKey(s)).toBe("jardim sao jose");
      expect(clientKey(s)).toBe(neighborhoodKey(s));
      expect(quoteDeliveryZone(zones,s,500)).toEqual({feeCents:750,zoneId:"centro"});
      expect(clientQuote(s,zones,500)).toEqual({feeCents:750,zoneId:"centro"});
    }
  });
  it("never uses client pricing and rejects zones outside coverage",()=>{
    expect(quoteDeliveryZone(zones,"vila verde",10)).toEqual({feeCents:1250,zoneId:"periferia"});
    expect(quoteDeliveryZone(zones,"Bairro inexistente",500)).toBeNull();
    expect(clientQuote("Bairro inexistente",zones,500)).toBeNull();
    expect(quoteDeliveryZone([], "Bairro qualquer",500)).toEqual({feeCents:500,zoneId:null});
  });
  it("accepts empty zones and valid unique neighborhood lists",()=>{
    expect(validateDeliveryZones([])).toEqual([]);
    expect(validateDeliveryZones(zones)).toEqual(zones);
  });
  it("rejects duplicate neighborhoods despite accents/case, malformed prices and IDs",()=>{
    for(const invalid of [
      [...zones,{id:"extra",name:"Dup",feeCents:900,neighborhoods:["JARDIM SAO JOSE"]}],
      [{...zones[0],feeCents:-1}],
      [{...zones[0],feeCents:NaN}],
      [{...zones[0],feeCents:100000.1}],
      [{...zones[0],id:"../../x"}],
      [{...zones[0],neighborhoods:[]}],
      [{...zones[0],neighborhoods:["Centro","centro"]}],
      [{...zones[0],privateKey:"do-not-accept"}],
    ])expect(()=>validateDeliveryZones(invalid)).toThrow();
  });
  it("limits zones and neighborhoods",()=>{
    const many=Array.from({length:21},(_,i)=>({
      id:"zone"+i,name:"Zona "+i,feeCents:100,neighborhoods:["Bairro "+i]}));
    expect(()=>validateDeliveryZones(many)).toThrow();
    expect(()=>validateDeliveryZones([{...zones[0],
      neighborhoods:Array.from({length:26},(_,i)=>"Bairro "+i)}])).toThrow();
  });
});

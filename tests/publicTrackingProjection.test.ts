import {describe,expect,it} from "vitest";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {projectPublicTracking}=require("../functions/domain/public-tracking.cjs");
const code="SV-ABCDEFGH";
function fixture(){
  return {publicCode:code,status:"received",fulfillmentMode:"delivery",estimatedMinutes:35,
    timeline:[{status:"received",at:"2026-10-29T20:00:00.000Z"}],
    customer:{name:"DO NOT LEAK",phone:"000"},address:{street:"PRIVATE"},
    payment:{card:"secret"},deliveryCode:"SECRET",internalSecret:"SECRET"};
}
describe("public tracking allowlist and tenant-safe code",()=>{
  it("only returns public projection, never private order contents",()=>{
    const result=projectPublicTracking(fixture(),code);
    expect(result).toEqual({publicCode:code,status:"received",fulfillmentMode:"delivery",estimatedMinutes:35,
      timeline:[{status:"received",at:"2026-10-29T20:00:00.000Z"}]});
    expect(JSON.stringify(result)).not.toMatch(/DO NOT LEAK|PRIVATE|SECRET|card/);
  });
  it("fails closed on mismatched or malformed codes",()=>{
    expect(projectPublicTracking(fixture(),"SV-ZZZZZZZZ")).toBeNull();
    expect(projectPublicTracking(fixture(),"../../secret")).toBeNull();
  });
  it("rejects corrupted fields and unknown statuses without leaking",()=>{
    expect(projectPublicTracking({...fixture(),status:"future_status"},code)).toBeNull();
    expect(projectPublicTracking({...fixture(),timeline:[{status:"received",at:{secret:true}}]},code)).toBeNull();
    expect(projectPublicTracking({...fixture(),fulfillmentMode:"other"},code)).toBeNull();
  });
});

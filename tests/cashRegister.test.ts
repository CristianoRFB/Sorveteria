import {createRequire} from "node:module";
import {describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
const require=createRequire(import.meta.url);
const {
  validateCashOpening,validateCashMovement,validateCashClosing,
  nextCashBalance,projectCashShift,projectCashMovement,
}=require("../functions/domain/cash-register.cjs");
const {evaluateFeature}=require("../functions/domain/entitlements.cjs");
const uuid=randomUUID(),shiftId="sh_"+uuid;
describe("manual cash register domain boundaries",()=>{
  it("accepts zero opening and valid amounts with idempotency UUID",()=>{
    expect(validateCashOpening({openingCents:0,requestId:uuid})).toEqual({openingCents:0,requestId:uuid});
    expect(validateCashMovement({shiftId,requestId:uuid,kind:"inflow",amountCents:250,
      note:"  Troco extra  "})).toMatchObject({note:"Troco extra",amountCents:250});
    expect(validateCashClosing({shiftId,countedCents:0}).countedCents).toBe(0);
  });
  it("rejects malformed or oversized opening and movement input",()=>{
    for(const input of [{openingCents:-1,requestId:uuid},{openingCents:1.2,requestId:uuid},
      {openingCents:5000001,requestId:uuid},{openingCents:200,requestId:"bad"},
      {openingCents:200,requestId:uuid,privateField:"unsafe"}])
      expect(()=>validateCashOpening(input)).toThrow();
    for(const input of [{kind:"inflow",amountCents:0},{kind:"outflow",amountCents:1000001},
      {kind:"inflow",amountCents:10,note:"ab"},
      {kind:"refund",amountCents:100},{kind:"inflow",amountCents:4.5}]){
      expect(()=>validateCashMovement({shiftId,requestId:uuid,note:"Troco",...input})).toThrow();
    }
    expect(()=>validateCashClosing({shiftId,countedCents:-1})).toThrow();
    expect(()=>validateCashClosing({shiftId,countedCents:10000001})).toThrow();
  });
  it("enforces non-negative expected balance including concurrent movements",()=>{
    expect(nextCashBalance(1000,"inflow",500)).toBe(1500);
    expect(nextCashBalance(1000,"outflow",999)).toBe(1);
    expect(nextCashBalance(1000,"outflow",1001)).toBeNull();
    expect(nextCashBalance(10000000,"inflow",1)).toBeNull();
    expect(()=>nextCashBalance(-10,"inflow",1)).toThrow();
    expect(()=>nextCashBalance(100,"inflow",0)).toThrow();
  });
  it("projects only safe shift and movement fields, never actor IDs or backend metadata",()=>{
    const shift=projectCashShift(shiftId,{
      status:"closed",openingCents:1000,inflowCents:200,outflowCents:50,
      expectedCents:1150,countedCents:1100,differenceCents:-50,
      openedAt:new Date("2026-10-31T00:00:00Z"),closedAt:new Date("2026-10-31T02:00:00Z"),
      openedBy:"SECRET_UID",closedBy:"SECRET_UID",tenantId:"SECRET_TENANT",
      metadata:"SECRET_METADATA",
    });
    const movement=projectCashMovement(uuid,{kind:"inflow",amountCents:200,
      note:"Aporte",createdAt:new Date("2026-10-31T01:00:00Z"),createdBy:"SECRET_UID"});
    expect(shift).toMatchObject({differenceCents:-50,expectedCents:1150,status:"closed"});
    expect(movement).toMatchObject({kind:"inflow",note:"Aporte",amountCents:200});
    expect(JSON.stringify({shift,movement})).not.toMatch(/SECRET_|createdBy|openedBy|closedBy|tenantId/);
  });
  it("denies inactive or lower plans but preserves Pro and Premium entitlements",()=>{
    for(const planId of ["pro","premium"])
      expect(evaluateFeature({status:"active",planId,subscriptionStatus:"active"},"cash_register").allowed).toBe(true);
    expect(evaluateFeature({status:"active",planId:"essencial",subscriptionStatus:"active"},"cash_register").allowed).toBe(false);
    expect(evaluateFeature({status:"active",planId:"pro",subscriptionStatus:"suspended"},"cash_register").allowed).toBe(false);
    expect(evaluateFeature({status:"active",planId:"pro",subscriptionStatus:"active",
      entitlementOverrides:{cash_register:false}},"cash_register").allowed).toBe(false);
  });
  it("disallows invalid shift documents and movement kinds in read projections",()=>{
    expect(projectCashShift("../unsafe",{status:"open"})).toBeNull();
    expect(projectCashShift(shiftId,{status:"tampered"})).toBeNull();
    expect(projectCashMovement(uuid,{kind:"refund",amountCents:10})).toBeNull();
  });
});

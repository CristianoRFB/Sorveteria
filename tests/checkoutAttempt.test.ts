import { describe, expect, it } from "vitest";
import { checkoutAttemptId,checkoutAttemptStorageKey,clearCheckoutAttemptId } from "../src/domain/checkoutAttempt";
const uuid="aa8de576-3125-4f87-a013-c9300fb18e7c";
describe("checkout retry IDs",()=>{
  it("persists across remount and clears after success",()=>{
    const items=new Map<string,string>();
    const store={getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>{items.set(k,v)},removeItem:(k:string)=>{items.delete(k)}};
    expect(checkoutAttemptId("alpha",null,store,()=>uuid)).toBe(uuid);
    expect(checkoutAttemptId("alpha",null,store,()=>{throw Error("regenerated")})).toBe(uuid);
    expect(items.get(checkoutAttemptStorageKey("alpha"))).toBe(uuid);
    clearCheckoutAttemptId("alpha",store);
    expect(items.has(checkoutAttemptStorageKey("alpha"))).toBe(false);
  });
  it("does not reuse an ID across tenants",()=>{
    const m=new Map<string,string>();
    const st={getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)}};
    expect(checkoutAttemptId("alpha",null,st,()=>uuid)).toBe(uuid);
    expect(checkoutAttemptId("beta",null,st,()=>"bc8de576-3125-4f87-a013-c9300fb18e7c")).not.toBe(uuid);
  });
  it("rejects non-crypto identifiers",()=>expect(()=>checkoutAttemptId("alpha",null,null,()=> "weak")).toThrow());
});

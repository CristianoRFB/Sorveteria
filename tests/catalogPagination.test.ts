import {describe,expect,it} from "vitest";
import {collectCatalogPages} from "../src/domain/catalogPagination";
describe("catalogue product pagination without commercial truncation",()=>{
  it("collects 250 products from three batches",async()=>{
    const ids=Array.from({length:250},(_,i)=>"p-"+String(i).padStart(3,"0"));
    const visited:Array<string|null>=[];
    const result=await collectCatalogPages(async cursor=>{
      visited.push(cursor);
      const start=cursor===null?0:ids.indexOf(cursor)+1;
      const products=ids.slice(start,start+100);
      return {categories:[{id:"gelatos"}],products,nextCursor:products.length===100?products[products.length-1]:null};
    });
    expect(result.products).toEqual(ids);
    expect(result.categories).toEqual([{id:"gelatos"}]);
    expect(visited).toEqual([null,"p-099","p-199"]);
  });
  it("rejects a nonadvancing cursor to prevent infinite loops",async()=>{
    await expect(collectCatalogPages(async()=>({
      categories:[],products:["a"],nextCursor:"same",
    }))).rejects.toThrow(/Paginação inconsistente/);
  });
  it("allows empty catalogues",async()=>{
    expect(await collectCatalogPages(async()=>({categories:[],products:[],nextCursor:null})))
      .toEqual({categories:[],products:[]});
  });
});

import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const file=JSON.parse(readFileSync("firestore.indexes.json","utf8"));
describe("production Firestore indexes for authorized delivery queries",()=>{
  it("provides driverId and updatedAt index for HTTPS driver assignments",()=>{
    const matching=file.indexes.some((index:{collectionGroup:string;queryScope:string;fields:Array<{fieldPath:string;order:string}>})=>
      index.collectionGroup==="deliveries"&&index.queryScope==="COLLECTION"
      &&index.fields.length===2
      &&index.fields[0].fieldPath==="driverId"&&index.fields[0].order==="ASCENDING"
      &&index.fields[1].fieldPath==="updatedAt"&&index.fields[1].order==="DESCENDING");
    expect(matching).toBe(true);
  });
});

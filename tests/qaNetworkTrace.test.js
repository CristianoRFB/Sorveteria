import { describe, expect, it } from "vitest";
import { createQaNetworkTrace } from "../scripts/lib/qaNetworkTrace.mjs";
describe("QA network tracing redacts secrets", () => {
  it("records timing but never URLs, query strings or headers", () => {
    let clock = 1000;
    const t = createQaNetworkTrace(() => clock);
    t.observe("Network.requestWillBeSent", {requestId:"id1",request:{url:"http://127.0.0.1:8088/tenants/SECRET?token=PRIVATE"}});
    clock = 1234;
    t.observe("Network.responseReceived", {requestId:"id1",response:{status:200,headers:{Authorization:"TOKEN"}}});
    t.observe("Network.loadingFinished", {requestId:"id1"});
    expect(t.events()).toEqual([{event:"request",service:"firestore"},{event:"response",service:"firestore",status:200,elapsedMs:234}]);
    expect(JSON.stringify(t.events())).not.toMatch(/SECRET|PRIVATE|TOKEN|id1/);
    expect(t.summary().inflight).toBe(0);
  });
  it("omits external websites and captures local network failures categorically", () => {
    const t = createQaNetworkTrace(() => 1000);
    t.observe("Network.requestWillBeSent", {requestId:"x",request:{url:"https://example.com/?token=SECRET"}});
    t.observe("Network.requestWillBeSent", {requestId:"f",request:{url:"http://localhost:5001/callable?token=SECRET"}});
    t.observe("Network.loadingFailed", {requestId:"f",errorText:"SECRET",corsErrorStatus:{},canceled:false});
    expect(t.events()).toEqual([{event:"request",service:"functions"},{event:"failed",service:"functions",elapsedMs:0,blocked:false,cors:true,cancelled:false}]);
  });
  it("keeps a bounded event history", () => {
    const t = createQaNetworkTrace();
    for (let n = 0; n < 400; n++) t.observe("Network.requestWillBeSent", {requestId:String(n),request:{url:"http://localhost:8088/secret"}});
    expect(t.events()).toHaveLength(300);
  });
});

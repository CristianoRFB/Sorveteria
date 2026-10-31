import {describe,expect,it} from "vitest";
import {firestoreTransportSettings} from "../src/domain/firestoreTransport";
describe("Firestore transport and environment isolation",()=>{
  it("forces long-polling for local emulators to avoid hanging WebChannel streams",()=>{
    expect(firestoreTransportSettings(true)).toEqual({experimentalForceLongPolling:true});
  });
  it("does not change Firestore transport settings in hosted environments",()=>{
    expect(firestoreTransportSettings(false)).toEqual({});
  });
});

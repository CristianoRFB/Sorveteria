import { describe, expect, it } from "vitest";
import { hostedFirebaseConfigurationProblems } from "../src/domain/firebaseDeploymentGuard";
const real = {
  apiKey:"public-firebase-api-key",authDomain:"sorveteria-staging-77.firebaseapp.com",
  projectId:"sorveteria-staging-77",storageBucket:"sorveteria-staging-77.firebasestorage.app",
  messagingSenderId:"123456789012",appId:"1:123456789012:web:some-app",
};
describe("hosted Firebase project safety",()=>{
  it("does not block local development with emulator fixture",()=>{
    expect(hostedFirebaseConfigurationProblems(false,true,{})).toEqual([]);
  });
  it("accepts a configured hosted project without emulators",()=>{
    expect(hostedFirebaseConfigurationProblems(true,false,real)).toEqual([]);
  });
  it("rejects emulator builds deployed to staging or production",()=>{
    expect(hostedFirebaseConfigurationProblems(true,true,real)).toContain("emulators-enabled");
  });
  it("rejects missing, demo and localhost Firebase configuration",()=>{
    const result=hostedFirebaseConfigurationProblems(true,false,{
      apiKey:"demo-api-key",authDomain:"localhost",projectId:"demo-sorveteria",
      storageBucket:"demo-sorveteria.appspot.com",messagingSenderId:"000000000000",
      appId:"1:000000000000:web:demo",
    });
    expect(result).toEqual(expect.arrayContaining(["demo-project","demo-api-key","local-auth-domain","synthetic-app","demo-storage"]));
  });
  it("rejects incomplete hosted configuration",()=>{
    expect(hostedFirebaseConfigurationProblems(true,false,{projectId:"some-project"})).toContain("missing-public-firebase-config");
  });
});

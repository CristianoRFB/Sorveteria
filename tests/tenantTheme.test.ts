import {describe,expect,it} from "vitest";
import {tenantThemeStyles} from "@/domain/tenantTheme";
import type {TenantBranding} from "@/domain/tenant";
const base:TenantBranding={
  displayName:"Alpha",primaryColor:"#6d28d9",secondaryColor:"#f1e9ff",
  backgroundColor:"#fffaf3",textColor:"#201a2a",borderRadius:"md",
};
describe("tenant theme respects a safe, consistent storefront palette",()=>{
  it("derives readable button text and white-label colors for all tenant routes",()=>{
    const style=tenantThemeStyles(base) as unknown as Record<string,string>;
    expect(style["--tenant-primary"]).toBe("#6d28d9");
    expect(style["--tenant-on-primary"]).toBe("#ffffff");
    expect(style["--tenant-radius"]).toBe("20px");
  });
  it("chooses dark text over a light branded primary",()=>{
    const style=tenantThemeStyles({...base,primaryColor:"#fffaf3",borderRadius:"lg"}) as unknown as Record<string,string>;
    expect(style["--tenant-on-primary"]).toBe("#111111");
    expect(style["--tenant-radius"]).toBe("28px");
  });
  it("rejects invalid CSS values instead of trusting tenant metadata",()=>{
    const style=tenantThemeStyles({...base,primaryColor:"red; background:url(javascript:bad)",
      secondaryColor:"transparent",borderRadius:"sm"}) as unknown as Record<string,string>;
    expect(style["--tenant-primary"]).toBe("#6d28d9");
    expect(style["--tenant-secondary"]).toBe("#f1e9ff");
    expect(style["--tenant-radius"]).toBe("12px");
    expect(tenantThemeStyles(undefined)).toBeUndefined();
  });
});

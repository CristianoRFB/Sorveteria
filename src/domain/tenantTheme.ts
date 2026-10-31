import type { CSSProperties } from "react";
import type { TenantBranding } from "@/domain/tenant";

/** Tenant colors are validated again before becoming CSS custom properties. */
const color=(v:string,fallback:string)=>/^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
function readableTextOn(hex:string):string {
  const channels=[1,3,5].map(start=>{
    const channel=parseInt(hex.slice(start,start+2),16)/255;
    return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4;
  });
  const luminance=channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
  return luminance>0.179?"#111111":"#ffffff";
}
export function tenantThemeStyles(branding:TenantBranding|undefined):CSSProperties|undefined {
  if(!branding)return undefined;
  const primary=color(branding.primaryColor,"#6d28d9");
  return {
    "--tenant-primary":primary,
    "--tenant-on-primary":readableTextOn(primary),
    "--tenant-secondary":color(branding.secondaryColor,"#f1e9ff"),
    "--tenant-bg":color(branding.backgroundColor,"#fffaf3"),
    "--tenant-text":color(branding.textColor,"#201a2a"),
    "--tenant-radius":branding.borderRadius==="sm"?"12px":branding.borderRadius==="lg"?"28px":"20px",
  } as CSSProperties;
}

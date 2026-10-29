import { describe, expect, it } from "vitest";
import { assessReleasePlan, RELEASE_FILES } from "../scripts/lib/release-readiness.mjs";
const headSha = "a".repeat(40);
const firebaseConfig = {functions:{runtime:"nodejs22",source:"functions"},firestore:{rules:"firestore.rules",indexes:"firestore.indexes.json"},storage:{rules:"storage.rules"}};
const context = {headSha,files:RELEASE_FILES,firebaseConfig,trackedPaths:["src/main.tsx","firebase.json"]};
const staging = {
  environment:"staging",projectId:"sorveteria-staging-77",domain:"staging.sorveteria.com.br",
  sourceSha:headSha,approvalRef:"change/2026-10-29-staging",accessRef:"review/access-2026-10",
  costRef:"review/budget-2026-10",
};
const production = {
  ...staging,environment:"production",projectId:"sorveteria-production-77",domain:"sorveteria.com.br",
  stagingProjectId:staging.projectId,backupRef:"evidence/backup-001",restoreRef:"evidence/restore-001",
  rollbackRef:"runbook/rollback-001",securityRef:"review/security-001",
  pilotRef:"evidence/pilot-001",stagingEvidenceRef:"evidence/staging-001",
  monitoringRef:"runbook/monitoring-001",
};
describe("offline release preflight is fail-closed and never authorizes deployment",()=>{
  it("blocks an absent manifest rather than calling it ready",()=>{
    const report=assessReleasePlan({},context);
    expect(report.decision).toBe("BLOCKED");
    expect(report.blockers).toContain("environment");
    expect(report.blockers).toContain("project-id");
  });
  it("rejects demo Firebase, localhost, fake domains and mismatched SHA",()=>{
    const report=assessReleasePlan({...staging,projectId:"demo-sorveteria",domain:"localhost",sourceSha:"f".repeat(40)},context);
    expect(report.blockers).toEqual(expect.arrayContaining(["project-id","domain","source-sha"]));
  });
  it("rejects staging without explicit approval, access and cost references",()=>{
    const report=assessReleasePlan({...staging,approvalRef:"",accessRef:"todo",costRef:null},context);
    expect(report.blockers).toEqual(expect.arrayContaining(["approvalRef","accessRef","costRef"]));
  });
  it("rejects missing rules and unsafe tracked secrets",()=>{
    const report=assessReleasePlan(staging,{...context,files:["firebase.json"],trackedPaths:[".env.production","keys/admin.pem"]});
    expect(report.blockers).toContain("repo-files");
    expect(report.blockers).toContain("tracked-secrets");
  });
  it("rejects deployment if runtime or Firebase Rules changed unexpectedly",()=>{
    const report=assessReleasePlan(staging,{...context,firebaseConfig:{...firebaseConfig,functions:{runtime:"nodejs20"}}});
    expect(report.blockers).toContain("firebase-config");
  });
  it("staging with structurally complete references still requires external review",()=>{
    const result=assessReleasePlan(staging,context);
    expect(result.blockers).toEqual([]);
    expect(result.decision).toBe("EXTERNAL_REVIEW_REQUIRED");
  });
  it("production additionally requires distinct staging and backup/restore/rollback/pilot evidence",()=>{
    const result=assessReleasePlan({...production,stagingProjectId:production.projectId,restoreRef:""},context);
    expect(result.blockers).toEqual(expect.arrayContaining(["distinct-staging","restoreRef"]));
  });
  it("complete production metadata is never treated as real-world authorization",()=>{
    const result=assessReleasePlan(production,context);
    expect(result.blockers).toEqual([]);
    expect(result.decision).toBe("EXTERNAL_REVIEW_REQUIRED");
  });
  it("rejects unknown fields so passwords cannot be smuggled into a release manifest",()=>{
    expect(assessReleasePlan({...staging,adminPassword:"do-not-log"},context).blockers).toContain("manifest-fields");
  });
});

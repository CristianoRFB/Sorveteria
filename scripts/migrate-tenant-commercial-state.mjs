import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import entitlementService from "../functions/domain/entitlements.cjs";

const { planCatalog } = entitlementService;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileIndex = args.indexOf("--file");
const filePath = fileIndex >= 0 ? args[fileIndex + 1] : null;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";
if (process.env.GCLOUD_PROJECT !== "demo-sorveteria" || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(emulatorHost)) {
  throw new Error("Migração recusada: use somente o Emulator Suite local do projeto demo-sorveteria.");
}
if (!filePath || filePath.startsWith("--")) {
  throw new Error("Informe um arquivo explícito: --file caminho-do-mapa.json. Sem --apply, a execução é somente leitura.");
}

const manifest = JSON.parse(await readFile(resolve(filePath), "utf8"));
if (!Array.isArray(manifest.tenants) || manifest.tenants.length === 0) throw new Error("O arquivo precisa conter uma lista tenants não vazia.");
const allowedStatuses = ["trial", "active", "past_due", "suspended", "cancelled", "demo"];
for (const entry of manifest.tenants) {
  if (!entry || typeof entry.tenantId !== "string" || !entry.tenantId.trim()
    || !Object.hasOwn(planCatalog.plans, entry.planId) || !allowedStatuses.includes(entry.subscriptionStatus)
    || typeof entry.reason !== "string" || entry.reason.trim().length < 3) {
    throw new Error("Cada tenant exige tenantId, planId, subscriptionStatus e reason explícitos.");
  }
  if (entry.subscriptionStatus === "trial" && entry.planId !== planCatalog.trial.planId) throw new Error("O trial aprovado usa somente o plano Pro.");
  if (entry.subscriptionStatus === "demo") throw new Error("A migração não atribui estado demo; use a callable em um cenário local controlado.");
}

const app = initializeApp({ projectId: "demo-sorveteria" }, "local-commercial-state-migration");
const db = getFirestore(app);
try {
  for (const entry of manifest.tenants) {
    const tenantRef = db.doc(`tenants/${entry.tenantId}`);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(tenantRef);
      if (!snapshot.exists) return { tenantId: entry.tenantId, result: "not-found" };
      const tenant = snapshot.data();
      const unassigned = tenant.planId == null && tenant.subscriptionStatus == null && !tenant.trialGrantedAt;
      if (!unassigned) {
        if (tenant.planId === entry.planId && tenant.subscriptionStatus === entry.subscriptionStatus) {
          return { tenantId: entry.tenantId, result: "already-matches" };
        }
        return { tenantId: entry.tenantId, result: "skip-review-required" };
      }
      const trialUntil = entry.subscriptionStatus === "trial"
        ? new Date(Date.now() + planCatalog.trial.durationDays * 24 * 60 * 60 * 1000)
        : tenant.trialUntil ?? null;
      if (apply) {
        const previous = { planId: tenant.planId ?? null, subscriptionStatus: tenant.subscriptionStatus ?? null };
        const next = {
          planId: entry.planId,
          subscriptionStatus: entry.subscriptionStatus,
          entitlementOverrides: tenant.entitlementOverrides || {},
          limitOverrides: tenant.limitOverrides || {},
          trialUntil,
        };
        transaction.update(tenantRef, {
          ...next,
          ...(entry.subscriptionStatus === "trial" ? { trialGrantedAt: FieldValue.serverTimestamp() } : {}),
          commercialRevision: (Number.isInteger(tenant.commercialRevision) ? tenant.commercialRevision : 0) + 1,
          commercialUpdatedAt: FieldValue.serverTimestamp(),
          commercialAssignedBy: "local_emulator_migration",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.create(tenantRef.collection("auditLogs").doc(), {
          tenantId: entry.tenantId,
          actorId: "local_emulator_migration",
          actorRole: "local_migration",
          action: "tenant.plan_migrated",
          entityType: "tenant_commercial_state",
          entityId: entry.tenantId,
          reason: entry.reason.trim(),
          metadata: { previous, next },
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return { tenantId: entry.tenantId, result: apply ? "migrated-local-emulator" : "would-migrate", planId: entry.planId, subscriptionStatus: entry.subscriptionStatus };
    });
    console.log(JSON.stringify(result));
    if (["not-found", "skip-review-required"].includes(result.result)) process.exitCode = 1;
  }
} finally {
  await deleteApp(app);
}

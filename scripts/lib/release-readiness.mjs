/** Offline release checks. This module NEVER deploys or contacts Firebase. */
const SHA = /^[a-f0-9]{40}$/i;
const META_KEYS = [
  "environment", "projectId", "stagingProjectId", "domain", "sourceSha",
  "approvalRef", "accessRef", "costRef", "migrationMode", "migrationApprovalRef", "backupRef", "restoreRef",
  "rollbackRef", "securityRef", "pilotRef", "stagingEvidenceRef", "monitoringRef",
];
const RELEASE_FILES = [
  "firebase.json", "firestore.rules", "firestore.indexes.json", "storage.rules",
  "functions/package.json", "src/lib/firebase.ts", ".github/workflows/ci.yml",
];
const REQUIRED_STAGING = ["approvalRef", "accessRef", "costRef"];
const REQUIRED_PRODUCTION = [
  ...REQUIRED_STAGING, "backupRef", "restoreRef", "rollbackRef", "securityRef",
  "pilotRef", "stagingEvidenceRef", "monitoringRef",
];
const SENSITIVE_TRACKED = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.firebaserc|[^/]*firebase-adminsdk[^/]*|[^/]*service[-_]?account[^/]*|[^/]*credentials[^/]*\.json|[^/]*\.(?:pem|p12|pfx|key))$/i;
function isExternalProjectId(v) {
  return typeof v === "string" && /^[a-z][a-z0-9-]{5,29}$/.test(v)
    && v !== "demo-sorveteria" && !v.startsWith("demo-");
}
function isPublicDomain(v) {
  if (typeof v !== "string" || v.length > 253 || v.includes("/") || v.includes(":")) return false;
  const labels = v.toLowerCase().split(".");
  if (labels.length < 2 || labels.some(part => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))) return false;
  const suffix = labels.at(-1);
  return !["local","localhost","test","invalid","example"].includes(suffix)
    && !/^(?:127|10|192|172)$/.test(labels[0]);
}
function isReference(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:/#-]{5,199}$/.test(value)
    && !/^(?:pending|todo|none|not-implemented|not-authorized|tbd)$/i.test(value);
}
export function assessReleasePlan(meta = {}, context = {}) {
  const checks = [];
  function gate(id, passed, message) {
    checks.push({ id, passed: Boolean(passed), message: passed ? "Condição estrutural atendida (não homologada externamente)." : message });
  }
  const env = meta?.environment;
  const validEnv = env === "staging" || env === "production";
  gate("environment", validEnv, "Informe environment=staging ou environment=production.");
  const unknownKeys = Object.keys(meta ?? {}).filter(key => !META_KEYS.includes(key));
  gate("manifest-fields", unknownKeys.length === 0, "Metadados desconhecidos: não inclua segredos nem novos campos no manifesto.");
  gate("project-id", isExternalProjectId(meta?.projectId), "Defina um Firebase projectId externo real, distinto de demo-sorveteria.");
  gate("domain", isPublicDomain(meta?.domain), "Domínio externo inválido; não use localhost, IP, URLs ou domínios fictícios.");
  gate("source-sha", SHA.test(meta?.sourceSha ?? "") && meta.sourceSha === context.headSha,
    "sourceSha deve ser o HEAD completo e exato do checkout verificado.");
  gate("repo-files", RELEASE_FILES.every(path => context.files?.includes(path)), "Arquivos obrigatórios do Firebase, Rules, Functions e CI ausentes.");
  const config = context.firebaseConfig;
  gate("firebase-config", Boolean(config && config.functions?.runtime === "nodejs22"
    && config.functions?.source === "functions" && config.firestore?.rules === "firestore.rules"
    && config.firestore?.indexes === "firestore.indexes.json"
    && config.storage?.rules === "storage.rules"), "firebase.json precisa apontar para Node 22, Rules e índices canônicos.");
  const tracked = context.trackedPaths ?? [];
  gate("tracked-secrets", !tracked.some(path => !/(?:^|\/)\.env\.(?:example|sample)$/i.test(path) && SENSITIVE_TRACKED.test(path)),
    "Há caminho sensível versionado; remova-o do Git e trate eventual exposição.");
  if (validEnv) {
    const required = env === "production" ? REQUIRED_PRODUCTION : REQUIRED_STAGING;
    for (const key of required) gate(key, isReference(meta?.[key]), "Informe referência documental não secreta para "+key+".");
    if (env === "production") {
      gate("migration-decision", ["none", "required"].includes(meta?.migrationMode),
        "Indique migrationMode=none ou required; não presuma migração de dados reais.");
      if (meta?.migrationMode === "required") gate("migrationApprovalRef", isReference(meta?.migrationApprovalRef),
        "Migração de dados reais exige aprovação explícita e separada do deploy.");
      gate("distinct-staging", isExternalProjectId(meta?.stagingProjectId) && meta.stagingProjectId !== meta.projectId,
        "Produção exige stagingProjectId real e distinto do projeto de produção.");
    } else if (meta?.stagingProjectId !== undefined) {
      gate("staging-consistency", meta.stagingProjectId === meta.projectId,
        "No manifesto de staging, stagingProjectId deve coincidir com projectId quando informado.");
    }
  }
  const blockers = checks.filter(c => !c.passed).map(c => c.id);
  return {
    environment: validEnv ? env : "unconfigured",
    decision: blockers.length ? "BLOCKED" : "EXTERNAL_REVIEW_REQUIRED",
    blockers, checks,
    note: "Validação estrutural offline. Referências fornecidas não comprovam autorização, backup, testes, acesso ou staging reais. Nenhum deploy é executado.",
  };
}
export { RELEASE_FILES, META_KEYS };

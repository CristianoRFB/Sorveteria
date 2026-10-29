#!/usr/bin/env node
/** Offline, read-only production/staging release preflight. Never deploys. */
import { readFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assessReleasePlan, RELEASE_FILES } from "./lib/release-readiness.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const has = name => args.includes(name);
function arg(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error("Falta valor para "+name);
  return args[index + 1];
}
const permitted = new Set(["--manifest", "--environment", "--json", "--allow-blocked", "--help"]);
for (const flag of args.filter(x => x.startsWith("--"))) {
  if (!permitted.has(flag)) throw new Error("Argumento não aceito: "+flag);
}
if (has("--help")) {
  console.log("Uso: node scripts/release-preflight.mjs --environment staging|production --manifest /caminho/manifesto.local.json [--json] [--allow-blocked]");
  console.log("Apenas leitura local. Nunca provisiona recursos, migra dados ou faz deploy.");
} else {
  const manifestPath = arg("--manifest");
  // In CI, missing manifest means BLOCKED but the tooling itself can be tested.
  const meta = manifestPath ? JSON.parse(await readFile(resolve(manifestPath), "utf8")) : {};
  if (arg("--environment")) meta.environment = arg("--environment");
  const files = [];
  for (const file of RELEASE_FILES) {
    try { await access(join(root, file)); files.push(file); } catch { /* reported below */ }
  }
  let firebaseConfig = null;
  try { firebaseConfig = JSON.parse(await readFile(join(root, "firebase.json"), "utf8")); } catch { /* reported below */ }
  let headSha = null;
  let trackedPaths = [];
  try {
    headSha = execFileSync("git", ["rev-parse", "HEAD"], {cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
    trackedPaths = execFileSync("git", ["ls-files", "-z"], {cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"]}).split("\0").filter(Boolean);
  } catch { /* not a Git checkout: the SHA gate fails closed */ }
  const result = assessReleasePlan(meta,{files,firebaseConfig,headSha,trackedPaths});
  if (has("--json")) console.log(JSON.stringify(result,null,2));
  else {
    console.log("RELEASE PREFLIGHT: "+result.decision+" ("+result.environment+")");
    for (const check of result.checks) console.log((check.passed ? "PASS " : "BLOCK ") + check.id + (check.passed ? "" : ": "+check.message));
    console.log(result.note);
  }
  if (result.blockers.length && !has("--allow-blocked")) process.exitCode = 2;
}

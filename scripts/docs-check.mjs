import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currentFile = path.join(root, "docs/CURRENT.md");
const current = await readFile(currentFile, "utf8");
const versionRel = current.match(/`(docs\/versions\/[^`]+)`/)?.[1];
if (!versionRel) throw new Error("docs/CURRENT.md precisa apontar para docs/versions/<versão>/.");
const version = path.join(root, versionRel);
const required = ["README.md", "STATUS.md", "ARCHITECTURE.md", "DATA_MODEL.md", "SECURITY.md", "FIREBASE_STRUCTURE.md", "PROJECT_STRUCTURE.md", "SCREENS.md", "GENERATED_VISUALS.md", "LEADS_OVERVIEW.md", "FEATURE_STATES.md"];
const errors = [];
async function exists(file) { try { await access(file); return true; } catch { return false; } }
for (const rel of [...required.map((name) => path.join(versionRel, name)), "docs/DIAGRAMS_MANIFEST.md", "docs/LEADS_MANIFEST.md"]) {
  if (!await exists(path.join(root, rel))) errors.push(`Arquivo obrigatório ausente: ${rel}`);
}

async function markdownFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}
const markdown = [currentFile, path.join(root, "docs/DIAGRAMS_MANIFEST.md"), path.join(root, "docs/LEADS_MANIFEST.md"), ...await markdownFiles(version)];
for (const file of markdown) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split(/\s+/)[0].split("#")[0];
    if (!target || /^(?:https?:|mailto:|data:|#)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!await exists(resolved)) errors.push(`Link local inválido em ${path.relative(root, file)}: ${target}`);
  }
}

const diagramManifest = await readFile(path.join(root, "docs/DIAGRAMS_MANIFEST.md"), "utf8");
for (const match of diagramManifest.matchAll(/\]\(([^)]+\.mmd)\)/g)) {
  if (!await exists(path.resolve(root, "docs", match[1]))) errors.push(`Fonte de diagrama ausente: ${match[1]}`);
}
for (const match of diagramManifest.matchAll(/\]\(([^)]+\.svg)\)/g)) {
  if (!await exists(path.resolve(root, "docs", match[1]))) errors.push(`Diagrama renderizado ausente: ${match[1]}`);
}
const visuals = await readFile(path.join(version, "GENERATED_VISUALS.md"), "utf8");
for (const match of visuals.matchAll(/`(generated\/[^`]+)`/g)) {
  if (!await exists(path.join(version, match[1]))) errors.push(`Visual referenciado ausente: ${match[1]}`);
}
const screens = await readFile(path.join(version, "SCREENS.md"), "utf8");
for (const match of screens.matchAll(/\]\((screenshots\/[^)]+)\)/g)) {
  if (!await exists(path.join(version, match[1]))) errors.push(`Screenshot referenciada ausente: ${match[1]}`);
}
for (const subdir of ["diagrams/source", "diagrams/rendered", "screenshots", "generated/concepts", "generated/covers"]) {
  if (!await exists(path.join(version, subdir))) errors.push(`Diretório documental ausente: ${subdir}`);
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Docs válidos: ${versionRel}; ${markdown.length} arquivos Markdown verificados.`);
}

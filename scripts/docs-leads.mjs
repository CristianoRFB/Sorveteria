import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "docs/LEADS_MANIFEST.md");
const overviewPath = path.join(root, "docs/versions/v06-multitenant-core-ready/LEADS_OVERVIEW.md");
const manifest = await readFile(manifestPath, "utf8");
const overview = await readFile(overviewPath, "utf8");
const declared = manifest.match(/Total de leads reais confirmados na documentação desta vertical:\s*(\d+)/i)?.[1];
if (declared == null) throw new Error("O manifesto precisa declarar explicitamente o total de leads confirmados.");
const slugs = [...manifest.matchAll(/\]\((?:versions\/[^/]+\/)?leads\/([a-z0-9-]+)\/LEAD_CONTEXT\.md\)/g)].map((match) => match[1]);
if (Number(declared) !== slugs.length) throw new Error(`Total declarado (${declared}) difere dos leads listados (${slugs.length}).`);
if (Number(declared) === 0 && !/Leads reais confirmados:\s*0/i.test(overview)) throw new Error("LEADS_OVERVIEW.md precisa confirmar zero leads.");
for (const slug of slugs) {
  const base = path.join(root, "docs/versions/v06-multitenant-core-ready/leads", slug);
  for (const file of ["LEAD_CONTEXT.md", "LEAD_REFERENCE_SUMMARY.md", "LEAD_VISUAL_DIRECTION.md"]) {
    try { await access(path.join(base, file)); } catch { throw new Error(`Lead ${slug} sem ${file}.`); }
  }
}
console.log(`Manifestos de leads válidos: ${slugs.length} leads reais confirmados.`);

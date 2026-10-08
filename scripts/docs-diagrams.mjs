import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const current = await readFile(path.join(root, "docs/CURRENT.md"), "utf8");
const versionDir = process.env.DOCS_VERSION_OVERRIDE || current.match(/`(docs\/versions\/[^`]+)`/)?.[1];
if (!versionDir) throw new Error("docs/CURRENT.md não aponta para uma versão canônica.");
const sourceDir = path.join(root, versionDir, "diagrams/source");
const outputDir = path.join(root, versionDir, "diagrams/rendered");
await mkdir(outputDir, { recursive: true });
const sources = (await readdir(sourceDir)).filter((name) => name.endsWith(".mmd")).sort();
if (!sources.length) throw new Error(`Nenhuma fonte Mermaid em ${path.relative(root, sourceDir)}.`);

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function wrap(text, max = 26) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > max) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function renderMermaid(source, title) {
  const labels = new Map();
  const edges = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const node = line.match(/^(\w+)\[(.+)\]$/);
    const edge = line.match(/^(\w+)\s*-->\s*(\w+)$/);
    if (node) labels.set(node[1], node[2].replace(/^['"]|['"]$/g, ""));
    if (edge) edges.push([edge[1], edge[2]]);
  }
  const ids = [...labels.keys()];
  if (ids.length < 2 || !edges.length) throw new Error(`Fonte Mermaid inválida ou fora do subconjunto suportado: ${title}`);
  const levels = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    for (const [from, to] of edges) levels.set(to, Math.max(levels.get(to) || 0, (levels.get(from) || 0) + 1));
  }
  const grouped = new Map();
  for (const id of ids) {
    const level = levels.get(id) || 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(id);
  }
  const maxLevel = Math.max(...grouped.keys());
  const maxInLayer = Math.max(...[...grouped.values()].map((items) => items.length));
  const width = Math.max(820, maxInLayer * 300 + 80);
  const cardW = 260;
  const cardH = 72;
  const gapY = 126;
  const positions = new Map();
  for (const [level, layer] of grouped) {
    const layerWidth = layer.length * 300 - 40;
    const offset = (width - layerWidth) / 2;
    layer.forEach((id, index) => positions.set(id, { x: offset + index * 300, y: 68 + level * gapY }));
  }
  const height = 150 + maxLevel * gapY;
  const paths = edges.map(([from, to]) => {
    const a = positions.get(from); const b = positions.get(to);
    const startX = a.x + cardW / 2; const startY = a.y + cardH;
    const endX = b.x + cardW / 2; const endY = b.y;
    const bendY = Math.round((startY + endY) / 2);
    return `<path d="M ${startX} ${startY} V ${bendY} H ${endX} V ${endY - 8}" fill="none" stroke="#8b67aa" stroke-width="2.5" marker-end="url(#arrow)"/>`;
  }).join("\n");
  const nodes = ids.map((id) => {
    const { x, y } = positions.get(id);
    const lines = wrap(labels.get(id));
    const startY = y + cardH / 2 - (lines.length - 1) * 9;
    const tspans = lines.map((line, index) => `<tspan x="${x + cardW / 2}" dy="${index === 0 ? 0 : 19}">${escapeXml(line)}</tspan>`).join("");
    return `<g><rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="16" fill="#fffaf3" stroke="#d8c8e5" stroke-width="2"/><text x="${x + cardW / 2}" y="${startY}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="600" fill="#33233c">${tspans}</text></g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">Diagrama renderizado da fonte Mermaid editável.</desc><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#8b67aa"/></marker></defs><rect width="100%" height="100%" fill="#f8f4fa"/><text x="${width / 2}" y="30" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700" fill="#4d2867">${escapeXml(title)}</text>${paths}${nodes}</svg>`;
}

for (const filename of sources) {
  const source = await readFile(path.join(sourceDir, filename), "utf8");
  const title = filename.replace(/\.mmd$/, "").replaceAll("-", " ");
  const svg = renderMermaid(source, title);
  await writeFile(path.join(outputDir, filename.replace(/\.mmd$/, ".svg")), `${svg}\n`, "utf8");
  console.log(`Renderizado ${path.relative(root, path.join(outputDir, filename.replace(/\.mmd$/, ".svg")))}`);
}

// ---------------------------------------------------------------------------
// check-citations.mjs — verify every PMID / DOI in public/data resolves live.
//
// The demo's trust chip is "follow any citation down to the source." A single
// dead PMID/DOI during the drill-down kills that narrative — so run this before
// every demo. Exits non-zero if any citation fails to resolve.
//
//   node scripts/check-citations.mjs
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "public", "data");

// Recursively collect every .json file under public/data.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

// Pull every { pmid } / { doi } value out of an arbitrary JSON structure.
function collect(files) {
  const pmids = new Set();
  const dois = new Set();
  for (const f of files) {
    const json = JSON.parse(readFileSync(f, "utf8"));
    JSON.stringify(json, (k, v) => {
      if (k === "pmid" && v) pmids.add(String(v).trim());
      if (k === "doi" && v) dois.add(String(v).trim());
      return v;
    });
  }
  return { pmids: [...pmids], dois: [...dois] };
}

// Verify a DOI is *registered* by checking the doi.org redirect, not the final
// publisher page (ASCO/NEJM etc. return 403 to non-browser clients — a valid DOI
// still 3xx-redirects; only an unregistered DOI 404s at doi.org).
async function resolveDoi(doi) {
  try {
    const res = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
      method: "HEAD",
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) return { ok: true, why: `${res.status} → registered` };
    if (res.status === 404) return { ok: false, why: "404 unregistered" };
    // 200 or a bot-blocked 403 after an auto-followed redirect both mean the DOI resolved.
    if (res.status === 200 || res.status === 403) return { ok: true, why: String(res.status) };
    return { ok: false, why: String(res.status) };
  } catch (e) {
    return { ok: false, why: `ERR ${e.code || e.message}` };
  }
}

// NCBI E-utilities: one batch call confirms which PMIDs are real records.
async function checkPmids(pmids) {
  if (!pmids.length) return [];
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" +
    pmids.join(",");
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  esummary HTTP ${res.status} — cannot verify PMIDs`);
    return pmids.map((id) => ({ id, ok: false, why: `esummary ${res.status}` }));
  }
  const data = await res.json();
  const result = data.result || {};
  return pmids.map((id) => {
    const rec = result[id];
    const ok = !!rec && !rec.error && !!rec.uid;
    return { id, ok, why: ok ? "" : "no PubMed record" };
  });
}

async function checkDois(dois) {
  const rows = [];
  for (const doi of dois) {
    const { ok, why } = await resolveDoi(doi);
    rows.push({ id: doi, ok, why });
  }
  return rows;
}

const files = walk(DATA);
const { pmids, dois } = collect(files);
console.log(`Scanned ${files.length} JSON files · ${pmids.length} PMIDs · ${dois.length} DOIs\n`);

const [pmidRows, doiRows] = await Promise.all([checkPmids(pmids), checkDois(dois)]);

const bad = [...pmidRows, ...doiRows].filter((r) => !r.ok);
for (const r of pmidRows) console.log(`  PMID ${r.id.padEnd(10)} ${r.ok ? "OK" : "FAIL — " + r.why}`);
for (const r of doiRows) console.log(`  DOI  ${r.id.padEnd(30)} ${r.ok ? "OK" : "FAIL — " + r.why}`);

console.log("");
if (bad.length) {
  console.error(`✗ ${bad.length} citation(s) failed to resolve:`);
  for (const r of bad) console.error(`    ${r.id} — ${r.why}`);
  process.exit(1);
}
console.log(`✓ All ${pmids.length + dois.length} citations resolve.`);

// ---------------------------------------------------------------------------
// build-data.mjs — REAL ngs-tertiary-analysis-skills output → platform JSON.
//
// Reads the actual pipeline artifacts for each sample:
//   06-clinical-annotation/escat_tiers.csv      (ESCAT tiers, master variant list)
//   06-clinical-annotation/oncokb_results.json  (oncogenicity, effect, treatments)
//   05-biomarkers/{tmb,msi,hrd}_result.json     (biomarkers + sub-scores)
//   03-cnv/cnvkit_segments.tsv                  (copy-number segments)
//   04-fusions/fusions.tsv                      (gene fusions)
//   07-literature/pubmed_hits.json              (real PubMed retrieval)
//   07-literature/narratives.json               (curated per-variant narratives)
//
// Patient identity / EMR is MOCKED per sample (PHI-free). The molecular content
// is the genuine analysis result. Cancer type is derived from OncoKB tumor_type.
//
// NGS reports dir: env NGS_REPORTS, else the default home path.
// Run: node scripts/build-data.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "data");
const REPORTS =
  process.env.NGS_REPORTS ||
  "/Users/htlin/ngs-tertiary-analysis-skills/reports";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readText = (p) => readFileSync(p, "utf8");

// minimal RFC-4180 CSV parser (handles quoted fields with commas)
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const na = (v) => (v === "NA" || v === "" || v == null ? null : v);
const num = (v) => (na(v) == null ? null : Number(v));

// ── Cancer type lookup (OncoKB code → display) ─────────────────────────────
const CANCER_NAME = {
  HGSOC: "High-grade serous ovarian carcinoma",
  BRCA: "Breast carcinoma",
  BREAST: "Breast carcinoma",
  LUAD: "Lung adenocarcinoma",
  COAD: "Colon adenocarcinoma",
  READ: "Rectal adenocarcinoma",
  UCEC: "Uterine endometrial carcinoma",
  STAD: "Gastric adenocarcinoma",
  PAAD: "Pancreatic ductal adenocarcinoma",
  NSCLC: "Non-small cell lung cancer",
};

// ── Cohort: real NGS samples + mocked patient identity ─────────────────────
// Identity fields (name/chart/age/team/…) are invented; the sample directory
// points at the genuine analysis output that drives the whole report.
const COHORT = [
  {
    sample: "EGA_OV_TSO500_001",
    chartNo: "99231004", name: "Amelia Chen", sex: "F", age: 58, birthday: "1967-03-12",
    stage: "IIIC", team: "Gynecologic Oncology", attending: "Dr. H. Lee", status: "pending-review",
    consultReason: "Newly sequenced HGSOC — MTB review for maintenance strategy.",
    priorTherapy: ["Carboplatin + Paclitaxel ×6", "Interval debulking surgery"],
    ecog: 1, reportDate: "2026-06-18",
  },
  {
    sample: "M25-1292R",
    chartNo: "99508213", name: "Grace Huang", sex: "F", age: 63, birthday: "1962-01-30",
    stage: "IIIB", team: "Breast Oncology", attending: "Dr. C. Chiu", status: "reviewed",
    consultReason: "HER2-mutant breast cancer — targeted therapy eligibility.",
    priorTherapy: ["Anthracycline-based adjuvant chemotherapy"],
    ecog: 0, reportDate: "2026-06-12",
  },
  {
    sample: "M25-1696R",
    chartNo: "99417882", name: "Sophia Lin", sex: "F", age: 49, birthday: "1976-08-25",
    stage: "IV", team: "Breast Oncology", attending: "Dr. C. Chiu", status: "processing",
    consultReason: "Endocrine-resistant HR+ breast cancer — next-line options.",
    priorTherapy: ["Letrozole", "Palbociclib + Fulvestrant"],
    ecog: 1, reportDate: "2026-06-20",
  },
  {
    sample: "M25-1684R",
    chartNo: "99662170", name: "Robert Chang", sex: "M", age: 66, birthday: "1959-11-02",
    stage: "IV", team: "Thoracic Oncology", attending: "Dr. Y. Kuo", status: "signed",
    consultReason: "Advanced NSCLC — driver mutation and TKI eligibility review.",
    priorTherapy: ["Platinum-doublet chemotherapy"],
    ecog: 1, reportDate: "2026-05-30",
  },
  {
    sample: "M25-1587R",
    chartNo: "99713945", name: "Daniel Wu", sex: "M", age: 67, birthday: "1958-05-19",
    stage: "IV", team: "GI Oncology", attending: "Dr. J. Wang", status: "pending-review",
    consultReason: "Metastatic pancreatic adenocarcinoma — actionable driver assessment.",
    priorTherapy: ["FOLFIRINOX"],
    ecog: 1, reportDate: "2026-06-15",
  },
];

// ── Per-sample assembly from real files ────────────────────────────────────
function buildReport(entry) {
  const dir = join(REPORTS, entry.sample);
  const clin = join(dir, "06-clinical-annotation");
  const bio = join(dir, "05-biomarkers");
  const lit = join(dir, "07-literature");

  // ESCAT is the master alteration list
  const escatRows = parseCsv(readText(join(clin, "escat_tiers.csv")));

  // OncoKB: index by gene|alteration for effect + treatments
  const oncokb = readJson(join(clin, "oncokb_results.json"));
  const okbIndex = new Map();
  let tumorCode = "";
  for (const m of [...(oncokb.mutations || []), ...(oncokb.cnas || []), ...(oncokb.fusions || [])]) {
    okbIndex.set(`${m.gene}|${m.alteration}`, m);
    if (!tumorCode && m.tumor_type) tumorCode = m.tumor_type;
  }

  // narratives (optional)
  const narratives = existsSync(join(lit, "narratives.json"))
    ? readJson(join(lit, "narratives.json"))
    : {};

  // Keep clinically meaningful alterations: any actionable tier (I–IV), or
  // oncogenic/likely-oncogenic regardless of tier. Drop the long tail of
  // Tier-X variants of unknown significance (VUS) that add noise.
  const isMeaningful = (r) =>
    r.escat_tier !== "X" || /oncogenic/i.test(r.oncogenic || "");
  const droppedVus = escatRows.length - escatRows.filter(isMeaningful).length;

  const variants = escatRows.filter(isMeaningful).map((r) => {
    const okb = okbIndex.get(`${r.gene}|${r.alteration}`) || {};
    const kind = r.type === "cna" ? "cna" : r.type === "fusion" ? "fusion" : "mutation";
    return {
      gene: r.gene,
      alteration: r.alteration,
      kind,
      oncogenicity: r.oncogenic,
      mutationEffect: na(okb.mutation_effect) || undefined,
      escat: r.escat_tier,
      escatDescription: r.escat_description,
      oncokbLevel: na(r.sensitive_level),
      resistanceLevel: na(r.resistance_level),
      treatments: (okb.treatments || []).map((t) => ({
        drugs: t.drugs,
        level: t.level,
        fdaApproved: !!t.fda_approved,
        description: t.description || "",
      })),
      narrative: narratives[`${r.gene}_${r.alteration}`] || undefined,
    };
  });

  // biomarkers (real)
  const tmb = readJson(join(bio, "tmb_result.json"));
  const msi = readJson(join(bio, "msi_result.json"));
  const hrd = readJson(join(bio, "hrd_result.json"));
  const biomarkers = {
    tmb: tmb.tmb_score, tmbClass: tmb.tmb_class,
    variantCount: tmb.variant_count, panelSizeMb: tmb.panel_size_mb,
    msi: msi.msi_status, msiScore: msi.msi_score,
    unstableSites: msi.unstable_sites, totalSites: msi.total_sites,
    hrd: hrd.hrd_score, hrdStatus: hrd.hrd_status,
    loh: num(hrd.loh_score), tai: num(hrd.tai_score), lst: num(hrd.lst_score),
    hrdReliable: !!hrd.is_reliable,
  };

  // CNV / fusions (optional TSVs)
  const cnv = readTsvMaybe(join(dir, "03-cnv", "cnvkit_segments.tsv")).map((r) => ({
    gene: r.gene, chromosome: r.chromosome,
    copyNumber: Number(r.copy_number), log2: Number(r.log2_ratio), type: r.type,
  }));
  const fusions = readTsvMaybe(join(dir, "04-fusions", "fusions.tsv")).map((r) => ({
    geneA: r.gene_a, geneB: r.gene_b, name: r.fusion_name,
    fusionType: r.fusion_type, supportingReads: Number(r.supporting_reads),
    known: String(r.known_fusion).toUpperCase() === "TRUE",
  }));

  // literature (real PubMed hits)
  const pubmed = existsSync(join(lit, "pubmed_hits.json"))
    ? readJson(join(lit, "pubmed_hits.json"))
    : [];
  const literature = (Array.isArray(pubmed) ? pubmed : []).map((h) => ({
    pmid: h.pmid, title: h.title, authors: h.authors,
    journal: h.journal, year: h.year,
    gene: h.query_gene || "", alteration: h.query_alteration || "",
  }));

  const cancerType = CANCER_NAME[tumorCode] || tumorCode || "Solid tumor";

  const patient = {
    chartNo: entry.chartNo, name: entry.name, sex: entry.sex, age: entry.age,
    birthday: entry.birthday, cancerType, cancerCode: tumorCode || "—",
    stage: entry.stage, team: entry.team, attending: entry.attending,
    status: entry.status, reportDate: entry.reportDate,
    sampleId: entry.sample, panel: `TSO500 · ${biomarkers.panelSizeMb} Mb`,
  };

  const clinical = {
    consultReason: entry.consultReason,
    priorTherapy: entry.priorTherapy,
    ecog: entry.ecog,
    note: `Molecular profiling on the ${patient.panel} panel returned ${variants.length} clinically annotated alterations (${droppedVus} variants of unknown significance filtered); TMB ${biomarkers.tmb} mut/Mb, ${biomarkers.msi}, ${biomarkers.hrdStatus}.`,
  };

  return { patient, clinical, biomarkers, variants, cnv, fusions, literature, droppedVus };
}

function readTsvMaybe(path) {
  if (!existsSync(path)) return [];
  const rows = parseCsv(readText(path).replace(/\t/g, ","));
  return rows;
}

// ── Emit ───────────────────────────────────────────────────────────────────
mkdirSync(join(OUT, "reports"), { recursive: true });

const reports = COHORT.map(buildReport);

const index = reports.map((r) => {
  const actionable = r.variants.filter((v) => v.escat === "I" || v.escat === "II");
  return {
    ...r.patient,
    actionableCount: actionable.length,
    topFindings: [...new Set(actionable.map((v) => v.gene))].slice(0, 4).join(", ") || "—",
  };
});

writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
for (const r of reports) {
  writeFileSync(join(OUT, "reports", `${r.patient.chartNo}.json`), JSON.stringify(r, null, 2));
}

console.log(`✓ Built ${reports.length} reports from real NGS analysis output`);
for (const r of reports) {
  const a = r.variants.filter((v) => v.escat === "I" || v.escat === "II").length;
  console.log(
    `  ${r.patient.sampleId.padEnd(20)} ${r.patient.cancerCode.padEnd(8)} ` +
      `variants=${String(r.variants.length).padStart(2)} actionable=${a} ` +
      `tx=${r.variants.reduce((n, v) => n + v.treatments.length, 0)} lit=${r.literature.length}`,
  );
}
console.log(`  → public/data/index.json + public/data/reports/*.json`);

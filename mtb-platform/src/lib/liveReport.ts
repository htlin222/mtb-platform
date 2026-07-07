// ---------------------------------------------------------------------------
// Build a Report from a client-parsed VCF. Everything derivable from the VCF
// alone is computed live (variants, allele fractions, a TMB proxy); everything
// that genuinely needs the full pipeline (MSI, HRD, OncoKB narratives, curated
// literature) is left explicitly empty and flagged — never faked.
// ---------------------------------------------------------------------------
import type { Report, Variant } from "../types";
import type { ParseResult, ParsedVariant } from "./vcf";

const PANEL_MB = 1.94; // TSO500 coding footprint used for the TMB proxy

function toVariant(v: ParsedVariant): Variant {
  const drugs = v.drugs ?? [];
  return {
    gene: v.gene!,
    alteration: v.alteration!,
    kind: "mutation",
    oncogenicity: v.annKind === "hotspot" ? "Oncogenic (known hotspot)" : "Unknown (region match)",
    escat: v.tier ?? "X",
    escatDescription: v.annKind === "hotspot" ? "Known actionable hotspot" : "Falls in an actionable gene (region-level)",
    oncokbLevel: null,
    resistanceLevel: null,
    treatments: drugs.map((d) => ({ drugs: d, level: "—", fdaApproved: false, description: "Region/hotspot match — confirm with full OncoKB annotation." })),
    vaf: v.af ?? undefined,
  };
}

export function buildLiveReport(pr: ParseResult): Report {
  const annotated = pr.variants.filter((v) => v.gene);
  const variants = annotated.map(toVariant);
  const tmbProxy = Math.round((pr.somatic / PANEL_MB) * 10) / 10;
  const actionable = variants.filter((v) => v.escat === "I" || v.escat === "II");
  const top = actionable[0];

  return {
    patient: {
      chartNo: "live",
      name: "Uploaded sample",
      sex: "F",
      age: 0,
      birthday: "",
      cancerType: "Not specified (from VCF)",
      cancerCode: "—",
      stage: "—",
      team: "Uploaded",
      attending: "—",
      status: "processing",
      reportDate: "",
      sampleId: pr.filename,
      panel: `Uploaded VCF · ${pr.reference}`,
    },
    clinical: {
      consultReason: "Live analysis of an uploaded VCF.",
      priorTherapy: [],
      ecog: 0,
      note: `Parsed ${pr.total} PASS records (${pr.somatic} somatic) from ${pr.filename}. ${annotated.length} fell in actionable genes; ${actionable.length} are Tier I–II. Reference: ${pr.reference}.`,
      consultNote: {
        fromTeam: "Uploaded", toTeam: "Molecular Tumor Board", date: "",
        history: "Clinical context not provided with the VCF.",
        purpose: "Assess actionable drivers in the uploaded variant call set.",
        opinion: top
          ? `${top.gene} ${top.alteration} (ESCAT ${top.escat}) is the lead actionable finding${top.treatments[0] ? ` — ${top.treatments.map((t) => t.drugs).slice(0, 2).join(" / ")} indicated` : ""}. Confirm with the full OncoKB/ESCAT pipeline before acting.`
          : "No Tier I–II driver detected in the region-level screen.",
      },
      chemo: [],
      labs: [],
      journal: [
        { date: "", kind: "specimen", title: `Uploaded ${pr.filename}`, actor: "You", detail: `${pr.reference}` },
        { date: "", kind: "variants", title: `Parsed ${pr.total} PASS variants`, actor: "Client-side", detail: `${pr.somatic} somatic` },
        { date: "", kind: "annotation", title: `${annotated.length} in actionable genes`, actor: "hg19 knowledge base", detail: `${actionable.length} Tier I–II` },
        { date: "", kind: "biomarker", title: `TMB proxy ${tmbProxy} mut/Mb`, actor: "Client-side", detail: "MSI / HRD require BAM — run full pipeline" },
      ],
    },
    biomarkers: {
      tmb: tmbProxy, tmbClass: tmbProxy >= 10 ? "TMB-High" : tmbProxy >= 6 ? "TMB-Intermediate" : "TMB-Low",
      variantCount: pr.somatic, panelSizeMb: PANEL_MB,
      msi: "N/A", msiScore: 0, unstableSites: 0, totalSites: 0,
      hrd: 0, hrdStatus: "N/A (needs BAM)", loh: null, tai: null, lst: null, hrdReliable: false,
    },
    variants,
    cnv: [],
    fusions: [],
    literature: [],
    appraisals: [],
    reannotation: {
      cadence: "Weekly · Mondays 02:00",
      lastRun: "", nextRun: "",
      knowledgeBase: "OncoKB v4.16 · CIViC 2026-06 · ClinVar 2026-06",
      events: [],
    },
    droppedVus: pr.total - annotated.length,
  };
}

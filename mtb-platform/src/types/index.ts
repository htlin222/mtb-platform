// ---------------------------------------------------------------------------
// MTB Platform — domain types.
//
// Molecular data is the REAL output of the ngs-tertiary-analysis-skills pipeline
// (OncoKB annotation, ESCAT tiering, biomarkers, CNV/fusion calls, PubMed
// retrieval, curated narratives). Patient identity / EMR is mocked per NGS
// sample (PHI-free). scripts/build-data.mjs joins the two.
// ---------------------------------------------------------------------------

// ── Actionability ──────────────────────────────────────────────────────────

/** ESCAT — ESMO Scale for Clinical Actionability of molecular Targets. */
export type EscatTier = "I" | "II" | "III" | "IV" | "X";

/** OncoKB evidence level, e.g. LEVEL_1, LEVEL_3A. */
export type OncokbLevel = string | null;

/** One OncoKB-matched therapy. */
export interface Treatment {
  drugs: string;
  level: string;
  fdaApproved: boolean;
  description: string;
}

/** A somatic alteration (mutation, CNA, or fusion) with clinical annotation. */
export interface Variant {
  gene: string;
  alteration: string;
  kind: "mutation" | "cna" | "fusion";
  oncogenicity: string; // "Oncogenic" | "Likely Oncogenic" | "Unknown" …
  mutationEffect?: string; // Loss-of-function …
  escat: EscatTier;
  escatDescription: string;
  oncokbLevel: OncokbLevel;
  resistanceLevel: string | null;
  treatments: Treatment[];
  narrative?: string; // curated markdown narrative, when available
}

// ── Biomarkers ─────────────────────────────────────────────────────────────

export interface Biomarkers {
  tmb: number;
  tmbClass: string; // TMB-Low | TMB-Intermediate | TMB-High
  variantCount: number;
  panelSizeMb: number;
  msi: string; // MSS | MSI-H
  msiScore: number;
  unstableSites: number;
  totalSites: number;
  hrd: number;
  hrdStatus: string; // HRD-positive | HRD-Negative
  loh: number | null;
  tai: number | null;
  lst: number | null;
  hrdReliable: boolean;
}

// ── Copy number & fusions ──────────────────────────────────────────────────

export interface Cnv {
  gene: string;
  chromosome: string;
  copyNumber: number;
  log2: number;
  type: string; // AMPLIFICATION | DELETION
}

export interface Fusion {
  geneA: string;
  geneB: string;
  name: string;
  fusionType: string; // in-frame …
  supportingReads: number;
  known: boolean;
}

// ── Literature (real PubMed retrieval) ─────────────────────────────────────

export interface LiteratureHit {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  gene: string;
  alteration: string;
}

// ── Patient identity / clinical context (mocked per sample) ────────────────

export type Sex = "M" | "F";
export type ReportStatus = "processing" | "pending-review" | "reviewed" | "signed";

export interface Patient {
  chartNo: string;
  name: string;
  sex: Sex;
  age: number;
  birthday: string; // ISO
  cancerType: string; // full name derived from OncoKB tumor_type
  cancerCode: string; // OncoKB tumor_type code (HGSOC …)
  stage: string;
  team: string;
  attending: string;
  status: ReportStatus;
  reportDate: string; // ISO
  sampleId: string; // NGS sample id
  panel: string; // sequencing panel
}

/** Mocked clinical context that frames the molecular report. */
export interface ClinicalContext {
  consultReason: string;
  priorTherapy: string[];
  ecog: number;
  note: string;
}

// ── Integrated report (platform's core artifact) ───────────────────────────

export interface Report {
  patient: Patient;
  clinical: ClinicalContext;
  biomarkers: Biomarkers;
  variants: Variant[];
  cnv: Cnv[];
  fusions: Fusion[];
  literature: LiteratureHit[];
  droppedVus: number; // count of Tier-X VUS filtered from the report
}

/** Worklist row (list page). */
export interface WorklistEntry extends Patient {
  actionableCount: number; // ESCAT I/II count
  topFindings: string; // e.g. "BRCA1, CCNE1"
}

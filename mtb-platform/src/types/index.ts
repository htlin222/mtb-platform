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
  vaf?: number; // allele fraction (from a parsed VCF)
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

// ── Systematic-review appraisal (robust-lit-review contract) ───────────────

export type GradeLevel = "High" | "Moderate" | "Low" | "Very Low";

export interface Pico {
  population: string;
  intervention: string;
  comparator: string;
  outcome: string;
  question: string;
}

/** PRISMA 2020 flow counts, as emitted by robust-lit-review. */
export interface Prisma {
  totalFound: number;
  afterDedup: number;
  afterYearFilter: number;
  afterQuality: number; // Q1 filter
  afterValidation: number;
  included: number;
  excludedByQuality: number;
}

export interface IncludedStudy {
  citationKey: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  pmid: string;
  quartile: "Q1" | "Q2" | "Q3" | "Q4";
  citationCount: number;
  verified: boolean; // CrossRef / PubMed verified
  openAccess: boolean;
}

/** A completed or rapid systematic-review appraisal of one actionable finding. */
export interface Appraisal {
  id: string;
  linkedGene: string;
  linkedAlteration: string;
  escat: EscatTier;
  provenance: "systematic-review" | "rapid-review";
  grade: GradeLevel;
  verdict: string; // one-line judgement
  pico: Pico;
  prisma: Prisma;
  includedStudies: IncludedStudy[];
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

export interface ConsultNote {
  fromTeam: string;
  toTeam: string;
  date: string;
  history: string;
  purpose: string;
  opinion: string;
}

export interface ChemoCourse {
  regimen: string;
  cycleNo: string;
  beginDate: string;
  status: string; // Completed | Planned | In progress
}

export interface LabValue {
  key: string;
  label: string;
  value: string;
  unit?: string;
  abnormal?: "high" | "low" | null;
}

/** One entry in the VCF / patient course journal. */
export interface JournalEvent {
  date: string; // ISO
  kind:
    | "chemo" | "specimen" | "sequencing" | "qc" | "variants"
    | "biomarker" | "annotation" | "literature" | "draft"
    | "consult" | "review" | "signoff" | "lab";
  title: string;
  actor: string;
  detail?: string;
}

// ── Re-annotation (variant significance changes over time) ─────────────────

/** One variant reclassified by a routine re-annotation run. */
export interface ReclassEvent {
  gene: string;
  alteration: string;
  fromCall: string; // e.g. "Variant of unknown significance"
  toCall: string; // e.g. "Likely Oncogenic"
  fromTier: EscatTier;
  toTier: EscatTier;
  date: string; // ISO — when the re-annotation flipped it
  source: string; // e.g. "OncoKB v4.16 + ClinVar 2026-06"
  nowActionable: boolean; // crossed into Tier I/II
  note: string; // curated clinical implication
}

/** Routine re-annotation status for a report. */
export interface Reannotation {
  cadence: string; // e.g. "Weekly · Mondays 02:00"
  lastRun: string; // ISO
  nextRun: string; // ISO
  knowledgeBase: string; // current KB version
  events: ReclassEvent[];
}

/** Mocked clinical context that frames the molecular report. */
export interface ClinicalContext {
  consultReason: string;
  priorTherapy: string[];
  ecog: number;
  note: string;
  consultNote: ConsultNote;
  chemo: ChemoCourse[];
  labs: LabValue[];
  journal: JournalEvent[];
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
  appraisals: Appraisal[]; // robust-lit-review systematic appraisals
  reannotation: Reannotation; // routine re-annotation status + reclassifications
  droppedVus: number; // count of Tier-X VUS filtered from the report
}

/** Worklist row (list page). */
export interface WorklistEntry extends Patient {
  actionableCount: number; // ESCAT I/II count
  topFindings: string; // e.g. "BRCA1, CCNE1"
  pendingReclass: number; // variants newly actionable since sign-off
}

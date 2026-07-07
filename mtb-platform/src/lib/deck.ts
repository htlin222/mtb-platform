// ---------------------------------------------------------------------------
// Case-presentation slide model. Turns one Report into an ordered, deterministic
// array of slides for the live molecular-tumor-board deck (Deck.tsx renders
// these and adds keyboard nav / printing / live narration). Pure — no I/O,
// no randomness, no dates-of-now.
// ---------------------------------------------------------------------------

import type { Report } from "../types";
import { isActionable } from "./format";

export type SlideKind =
  | "title"
  | "history"
  | "molecular"
  | "actionable"
  | "evidence"
  | "recommendation";

export interface BiomarkerBadge {
  label: string;
  value: string;
}

export interface VariantRow {
  gene: string;
  alteration: string;
  escat: string;
}

/** A finding on the actionable / evidence slides. `drugs` is set on the
 *  actionable slide and omitted on the evidence slide. */
export interface SlideFinding {
  gene: string;
  alteration: string;
  escat: string;
  drugs?: string;
}

/** A single deck slide. Kind-specific payload lives in optional, well-named
 *  fields; only the ones relevant to `kind` are populated. */
export interface Slide {
  kind: SlideKind;
  title: string; // slide heading
  narration?: string; // filled live later; undefined at build time

  // title slide
  patientName?: string;
  subtitle?: string;
  meta?: string;

  // history + recommendation slides
  bullets?: string[];

  // molecular slide
  biomarkerBadges?: BiomarkerBadge[];
  variantRows?: VariantRow[];

  // actionable + evidence slides
  findings?: SlideFinding[];
}

const RECOMMENDATION_BULLETS = [
  "Confirm maintenance strategy at board",
  "Review matched trial eligibility",
];

function titleSlide(report: Report): Slide {
  const { patient } = report;
  return {
    kind: "title",
    title: "Case Presentation",
    patientName: patient.name,
    subtitle: `${patient.cancerType} · Stage ${patient.stage}`,
    meta: `${patient.sampleId} · ${patient.panel} · ${patient.reportDate}`,
  };
}

function historySlide(report: Report): Slide {
  const { clinical } = report;
  const bullets = [
    clinical.consultReason,
    ...clinical.priorTherapy,
    `ECOG ${clinical.ecog}`,
    ...clinical.chemo.map(
      (c) => `${c.regimen} — cycle ${c.cycleNo} (${c.status})`,
    ),
  ];
  return { kind: "history", title: "Clinical History", bullets };
}

function molecularSlide(report: Report): Slide {
  const { biomarkers, variants } = report;
  const biomarkerBadges: BiomarkerBadge[] = [
    { label: "TMB", value: `${biomarkers.tmb} mut/Mb · ${biomarkers.tmbClass}` },
    { label: "MSI", value: biomarkers.msi },
    { label: "HRD", value: biomarkers.hrdStatus },
  ];
  const variantRows: VariantRow[] = variants.map((v) => ({
    gene: v.gene,
    alteration: v.alteration,
    escat: v.escat,
  }));
  return { kind: "molecular", title: "Molecular Profile", biomarkerBadges, variantRows };
}

function actionableVariants(report: Report) {
  return report.variants.filter(isActionable);
}

function actionableSlide(report: Report): Slide {
  const findings: SlideFinding[] = actionableVariants(report).map((v) => ({
    gene: v.gene,
    alteration: v.alteration,
    escat: v.escat,
    drugs: v.treatments[0]?.drugs ?? "—",
  }));
  return { kind: "actionable", title: "Actionable Findings", findings };
}

function evidenceSlide(report: Report): Slide {
  const findings: SlideFinding[] = actionableVariants(report).map((v) => ({
    gene: v.gene,
    alteration: v.alteration,
    escat: v.escat,
  }));
  return { kind: "evidence", title: "Evidence Review", findings };
}

function recommendationSlide(): Slide {
  return {
    kind: "recommendation",
    title: "Recommendations",
    bullets: [...RECOMMENDATION_BULLETS],
  };
}

/** Build the ordered case-presentation deck: exactly six slides. */
export function buildSlides(report: Report): Slide[] {
  return [
    titleSlide(report),
    historySlide(report),
    molecularSlide(report),
    actionableSlide(report),
    evidenceSlide(report),
    recommendationSlide(),
  ];
}

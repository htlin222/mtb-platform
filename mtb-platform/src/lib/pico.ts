// ---------------------------------------------------------------------------
// Deterministic per-variant PICO + GRADE derivation. Turns one somatic Variant
// into a structured PICO question, a GRADE certainty, a one-line verdict, and
// the gene's citable studies — the input contract of the KnowledgeCard.
// ---------------------------------------------------------------------------

import type { EscatTier, GradeLevel, LiteratureHit, Pico, Variant } from "../types";
import type { CiteSource } from "./citation";
import { buildQuestion } from "./research";

export interface DerivedKnowledge {
  pico: Pico;
  grade: GradeLevel;
  verdict: string;
  studies: CiteSource[];
}

const ESCAT_GRADE: Record<EscatTier, GradeLevel> = {
  I: "High",
  II: "Moderate",
  III: "Low",
  IV: "Very Low",
  X: "Very Low",
};

export function deriveKnowledge(variant: Variant, cancerType: string, literature: LiteratureHit[]): DerivedKnowledge {
  const hasTreatment = variant.treatments.length > 0;
  const population = `Patients with ${cancerType}`;
  const intervention = hasTreatment ? variant.treatments[0].drugs : "targeted therapy under investigation";
  const comparator = "standard of care";
  const outcome = variant.escat === "I" ? "Overall survival" : "Progression-free survival";
  const question = buildQuestion({ population, intervention, comparator, outcome });

  const grade: GradeLevel = variant.oncokbLevel === "LEVEL_1" ? "High" : ESCAT_GRADE[variant.escat];

  const verdict = hasTreatment
    ? `${grade} certainty of benefit — ${intervention}`
    : `${grade} certainty — ${variant.gene} ${variant.alteration} under investigation`;

  const studies: CiteSource[] = literature.map((h) => ({
    authors: h.authors,
    title: h.title,
    journal: h.journal,
    year: h.year,
    pmid: h.pmid,
  }));

  return { pico: { population, intervention, comparator, outcome, question }, grade, verdict, studies };
}

// ---------------------------------------------------------------------------
// Curated research-topic development. A deterministic, guided dialogue that
// turns a clinical / molecular gap into a structured systematic-review topic
// spec — the input contract of robust-lit-review (picos.json).
//
// No LLM backend: the assistant turns and quick replies are curated so the
// module runs offline and is fully reproducible.
// ---------------------------------------------------------------------------

export interface TopicSpec {
  title: string;
  population: string;
  intervention: string;
  comparator: string;
  outcome: string;
  question: string;
  inclusion: string[];
  searchTerms: string[];
  priority: number;
}

/** Candidate topics seeded from the cohort's rapid-review / lower-tier gaps. */
export interface SeedTopic {
  id: string;
  gap: string; // where the gap came from
  title: string;
  population: string;
  intervention: string;
  defaultOutcome: string;
  searchTerms: string[];
}

export const SEED_TOPICS: SeedTopic[] = [
  {
    id: "ccne1",
    gap: "CCNE1 amplification (ESCAT II) — rapid review only",
    title: "CCNE1 amplification and CDK2 inhibition in gynecologic cancers",
    population: "Patients with CCNE1-amplified high-grade serous ovarian carcinoma",
    intervention: "CDK2 inhibitors (e.g. lunresertib, BLU-222)",
    defaultOutcome: "Progression-free survival",
    searchTerms: ["CCNE1 amplification", "CDK2 inhibitor", "cyclin E", "ovarian carcinoma", "platinum resistance"],
  },
  {
    id: "kras",
    gap: "KRAS G12 (ESCAT II) — pancreatic, limited evidence",
    title: "KRAS-directed therapy in pancreatic adenocarcinoma",
    population: "Patients with KRAS-mutant pancreatic ductal adenocarcinoma",
    intervention: "KRAS inhibitors and downstream MAPK-pathway agents",
    defaultOutcome: "Overall survival",
    searchTerms: ["KRAS", "pancreatic adenocarcinoma", "MRTX", "sotorasib", "MAPK pathway"],
  },
  {
    id: "esr1",
    gap: "ESR1 mutation — endocrine resistance question",
    title: "ESR1 mutations and next-generation endocrine therapy in breast cancer",
    population: "Patients with ESR1-mutant, endocrine-resistant HR+ breast cancer",
    intervention: "Oral SERDs (e.g. elacestrant)",
    defaultOutcome: "Progression-free survival",
    searchTerms: ["ESR1 mutation", "SERD", "elacestrant", "endocrine resistance", "breast cancer"],
  },
];

export const OUTCOME_OPTIONS = [
  "Progression-free survival",
  "Overall survival",
  "Objective response rate",
  "Safety and toxicity",
];

export const COMPARATOR_OPTIONS = ["Standard of care", "Placebo", "Active comparator", "No comparator (single-arm)"];

/** The default rigor criteria robust-lit-review applies. */
export const DEFAULT_INCLUSION = [
  "Human clinical studies (RCT, cohort, meta-analysis)",
  "Published 2016 or later",
  "Q1 journal (SJR quartile)",
  "CrossRef-verified DOI",
  "English language",
];

/** Estimate a PRISMA yield for the confirmed topic (curated heuristic). */
export function estimatePrisma(spec: TopicSpec) {
  const base = 60 + spec.searchTerms.length * 22;
  const afterDedup = Math.round(base * 0.9);
  const afterQuality = Math.round(afterDedup * 0.18);
  const included = Math.max(6, Math.round(afterQuality * 0.85));
  return { totalFound: base, afterDedup, afterQuality, included };
}

export function buildQuestion(s: Pick<TopicSpec, "population" | "intervention" | "comparator" | "outcome">) {
  const vs = s.comparator === "No comparator (single-arm)" ? "" : ` versus ${s.comparator.toLowerCase()}`;
  return `In ${s.population.toLowerCase()}, does ${s.intervention.toLowerCase()} improve ${s.outcome.toLowerCase()}${vs}?`;
}

// ---------------------------------------------------------------------------
// Molecular Tumor Board — expert panel model (inspired by clinboard's
// multi-skill dispatch + decision capture). Convene a panel of specialist
// perspectives on a case; each gives a curated opinion parameterised by the
// case's real molecular findings, then endorses or dissents.
//
// Offline / curated: opinions are deterministic templates plugged with real
// data — no LLM backend.
// ---------------------------------------------------------------------------
import type { Report, Variant } from "../types";

export type Vote = 1 | -1 | 0; // endorse | dissent | abstain
export type Category = "clinical" | "molecular" | "pharmacy" | "trials";

export interface Expert {
  id: string;
  name: string;
  role: string;
  category: Category;
  initials: string;
  /** curated opinion on the case's top finding */
  opinion: (r: Report, top: Variant | undefined) => string;
  /** default stance the persona takes */
  vote: (r: Report, top: Variant | undefined) => Vote;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  clinical: "Clinical",
  molecular: "Molecular",
  pharmacy: "Pharmacy",
  trials: "Clinical trials",
};

const drugList = (v?: Variant) => v?.treatments.map((t) => t.drugs).slice(0, 2).join(" / ") || "the matched agent";
const isActionable = (v?: Variant) => !!v && (v.escat === "I" || v.escat === "II");

export const EXPERTS: Expert[] = [
  {
    id: "med-onc", name: "Dr. A. Medina", role: "Medical Oncologist", category: "clinical", initials: "AM",
    opinion: (r, v) => v
      ? `The ${v.gene} ${v.alteration} finding is ESCAT ${v.escat}. I recommend ${drugList(v)} as the next line for this ${r.patient.cancerType.toLowerCase()}. ${r.biomarkers.hrdStatus.toLowerCase().includes("positive") ? "HRD-positive status reinforces PARP-inhibitor maintenance." : ""} Prior lines were ${r.clinical.priorTherapy.join(", ").toLowerCase()}; the patient is ECOG ${r.clinical.ecog} and fit to proceed.`
      : "No Tier I–II driver — I would continue standard of care and reassess at progression.",
    vote: (_r, v) => isActionable(v) ? 1 : 0,
  },
  {
    id: "mol-gen", name: "Dr. S. Okafor", role: "Molecular Geneticist", category: "molecular", initials: "SO",
    opinion: (r, v) => v
      ? `${v.gene} ${v.alteration} is classified ${v.oncogenicity.toLowerCase()}${v.mutationEffect ? ` with ${v.mutationEffect.toLowerCase()}` : ""}. This is a bona fide driver, not a passenger. OncoKB ${v.oncokbLevel ?? "unassigned"}. The call is well supported at this panel's coverage (${r.biomarkers.panelSizeMb} Mb).`
      : "The variant landscape is dominated by variants of unknown significance; nothing rises to actionable driver status.",
    vote: () => 1,
  },
  {
    id: "path", name: "Dr. L. Rossi", role: "Pathologist", category: "clinical", initials: "LR",
    opinion: (r) => `Histology is consistent with ${r.patient.cancerType.toLowerCase()}, stage ${r.patient.stage}. Tumour cellularity was adequate for sequencing. I would corroborate the molecular call with IHC where a companion assay exists before committing to targeted therapy.`,
    vote: () => 1,
  },
  {
    id: "pharm", name: "Dr. K. Tan", role: "Clinical Pharmacist", category: "pharmacy", initials: "KT",
    opinion: (_r, v) => v
      ? `${drugList(v)} is doseable for this patient. Watch for class-specific toxicity — for PARP inhibitors, monitor CBC for myelosuppression; review CYP interactions against current medications. No absolute contraindication on file.`
      : "No targeted agent to review. I would keep supportive-care protocols in place.",
    vote: (_r, v) => isActionable(v) ? 1 : 0,
  },
  {
    id: "trials", name: "Dr. M. Haas", role: "Clinical Trials Coordinator", category: "trials", initials: "MH",
    opinion: (r, v) => v && v.escat === "II"
      ? `${v.gene} ${v.alteration} is trial-enabling (ESCAT II). We have an open basket study for ${v.gene}-altered solid tumours — this patient likely meets eligibility. I'd prioritise enrolment over off-label use.`
      : v
        ? `A registrational option exists on-label, so a trial is second-line. I can still screen for maintenance-phase studies matching ${r.patient.cancerType.toLowerCase()}.`
        : "I'll screen molecularly-unselected trials given no actionable target.",
    vote: (_r, v) => (v ? 1 : 0),
  },
  {
    id: "rad-onc", name: "Dr. P. Nawra", role: "Radiation Oncologist", category: "clinical", initials: "PN",
    opinion: (r) => `This is a systemically-driven decision. Radiation has no primary role here beyond palliation of symptomatic sites. I abstain on the systemic recommendation but remain available for local control of stage ${r.patient.stage} disease.`,
    vote: () => 0,
  },
  {
    id: "bioinf", name: "Dr. R. Vale", role: "Bioinformatician", category: "molecular", initials: "RV",
    opinion: (r) => `Biomarker QC: TMB ${r.biomarkers.tmb} mut/Mb (${r.biomarkers.tmbClass}), ${r.biomarkers.msi}, ${r.biomarkers.hrdStatus}${r.biomarkers.hrdReliable ? "" : " — HRD flagged low-confidence due to tumour fraction"}. ${r.droppedVus} VUS filtered from ${r.variants.length + r.droppedVus} calls. Coverage and metrics are within spec for a confident report.`,
    vote: (r) => (r.biomarkers.hrdReliable ? 1 : 0),
  },
];

export const DEFAULT_PANEL = ["med-onc", "mol-gen", "pharm"];

export function topFinding(r: Report): Variant | undefined {
  return r.variants.find((v) => v.escat === "I") || r.variants.find((v) => v.escat === "II") || r.variants[0];
}

export const VOTE_META: Record<"1" | "-1" | "0", { label: string; variant: "success" | "danger" | "neutral" }> = {
  "1": { label: "Endorse", variant: "success" },
  "-1": { label: "Dissent", variant: "danger" },
  "0": { label: "Abstain", variant: "neutral" },
};

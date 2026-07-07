// The real ngs-tertiary-analysis-skills pipeline stages (00 → 08), mirrored 1:1
// so the processing view reflects the actual tool chain.
import type { Report } from "../types";

export interface Stage {
  id: string;
  name: string;
  tool: string;
  detail: (r: Report) => string;
}

export const STAGES: Stage[] = [
  { id: "00-qc", name: "Quality control", tool: "FastQC · samtools",
    detail: () => "Read quality, coverage and contamination checks passed" },
  { id: "01-variant-calling", name: "Variant calling", tool: "DRAGEN · bcftools",
    detail: (r) => `${r.biomarkers.variantCount} small variants called from the VCF` },
  { id: "02-annotation", name: "Annotation", tool: "Ensembl VEP",
    detail: (r) => `HGVS, ClinVar, COSMIC, gnomAD annotated across ${r.variants.length + r.droppedVus} alterations` },
  { id: "03-cnv", name: "Copy number", tool: "CNVkit",
    detail: (r) => `${r.cnv.length} copy-number segment(s) detected` },
  { id: "04-fusions", name: "Fusions", tool: "Manta",
    detail: (r) => r.fusions.length ? `${r.fusions.length} fusion(s): ${r.fusions.map((f) => f.name).join(", ")}` : "No fusions detected" },
  { id: "05-biomarkers", name: "Biomarkers", tool: "TMB · MSI · HRD",
    detail: (r) => `TMB ${r.biomarkers.tmb} mut/Mb · ${r.biomarkers.msi} · ${r.biomarkers.hrdStatus}` },
  { id: "06-clinical-annotation", name: "Clinical annotation", tool: "OncoKB · CIViC · ESCAT",
    detail: (r) => {
      const act = r.variants.filter((v) => v.escat === "I" || v.escat === "II").length;
      return `${r.variants.length} annotated · ${act} Tier I–II actionable`;
    } },
  { id: "07-literature", name: "Literature", tool: "PubMed · robust-lit-review",
    detail: (r) => `${r.literature.length} records retrieved · ${r.appraisals.length} appraisal(s) with PRISMA + GRADE` },
  { id: "08-report", name: "Report", tool: "Quarto · ESMO 2024",
    detail: () => "Molecular report assembled and ready for MTB review" },
];

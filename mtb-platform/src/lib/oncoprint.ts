// Build an oncoprint / "sample matrix" (genes × samples) from the cohort's
// reports — inspired by the ASH HematOmics Program (ASHOP) Sample Matrix.
import type { Report, EscatTier } from "../types";

export type AltType = "mutation" | "amplification" | "deletion" | "fusion";

export const ALT_COLOR: Record<AltType, string> = {
  mutation: "#108548", // green
  amplification: "#dd2b0e", // red
  deletion: "#1f75cb", // blue
  fusion: "#6666c4", // purple
};

export const ALT_LABEL: Record<AltType, string> = {
  mutation: "Mutation",
  amplification: "Amplification",
  deletion: "Deletion",
  fusion: "Fusion",
};

export interface Cell {
  alts: { type: AltType; alteration: string; escat: EscatTier }[];
}

export interface OncoSample {
  chartNo: string;
  name: string;
  cancerType: string;
}

export interface Oncoprint {
  samples: OncoSample[];
  genes: string[]; // recurrent, ranked
  matrix: Record<string, Record<string, Cell>>; // gene → chartNo → cell
  freq: Record<string, number>; // gene → # samples altered
}

function altTypeOf(kind: string, alteration: string): AltType {
  if (kind === "fusion") return "fusion";
  if (kind === "cna") return /ampl/i.test(alteration) ? "amplification" : "deletion";
  return "mutation";
}

export function buildOncoprint(reports: Report[], maxGenes = 16): Oncoprint {
  const samples: OncoSample[] = reports.map((r) => ({
    chartNo: r.patient.chartNo, name: r.patient.name, cancerType: r.patient.cancerType,
  }));
  // group columns by cancer type for readability
  samples.sort((a, b) => a.cancerType.localeCompare(b.cancerType) || a.name.localeCompare(b.name));

  const matrix: Record<string, Record<string, Cell>> = {};
  const freq: Record<string, number> = {};

  for (const r of reports) {
    const seen = new Set<string>();
    for (const v of r.variants) {
      const t = altTypeOf(v.kind, v.alteration);
      matrix[v.gene] ??= {};
      const cell = (matrix[v.gene][r.patient.chartNo] ??= { alts: [] });
      cell.alts.push({ type: t, alteration: v.alteration, escat: v.escat });
      if (!seen.has(v.gene)) { freq[v.gene] = (freq[v.gene] ?? 0) + 1; seen.add(v.gene); }
    }
  }

  const genes = Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a] || a.localeCompare(b))
    .slice(0, maxGenes);

  return { samples, genes, matrix, freq };
}

// ---------------------------------------------------------------------------
// mutationMapper.ts — lollipop-plot model, in the spirit of cBioPortal's
// Mutation Mapper (https://www.cbioportal.org/mutation_mapper).
//
// Turns a gene's protein-change strings (e.g. "V600E", "R248W", "E1836fs")
// into positioned lollipops on a protein backbone with Pfam-style domains, so
// clustering (hotspots) and functional context (which domain) are visible at a
// glance. Protein lengths / domains are curated from UniProt + Pfam for the
// cohort's recurrent genes; unknown genes render a bare backbone.
// ---------------------------------------------------------------------------
import type { EscatTier, Report } from "../types";

// cBioPortal-style mutation classes, mapped to GitLab Pajamas palette tokens.
export type MutClass = "missense" | "truncating" | "inframe" | "other";

export const MUT_COLOR: Record<MutClass, string> = {
  missense: "var(--green-500)", // #108548
  truncating: "var(--gray-950)", // #1f1e24
  inframe: "var(--orange-500)", // #c17d10
  other: "var(--purple-500)", // #6666c4
};

export const MUT_LABEL: Record<MutClass, string> = {
  missense: "Missense",
  truncating: "Truncating",
  inframe: "Inframe indel",
  other: "Other",
};

export interface ProteinDomain {
  name: string; // Pfam label
  start: number; // aa
  end: number; // aa
  color: string;
}

export interface ProteinModel {
  length: number; // aa
  domains: ProteinDomain[];
}

// Pajamas accent tokens cycled for domain fills (soft tints keep lollipops legible).
const D = ["var(--blue-100)", "var(--purple-100)", "var(--orange-100)", "var(--green-100)", "var(--red-100)"];

// Curated canonical protein length + key Pfam domains for the cohort's genes.
export const PROTEINS: Record<string, ProteinModel> = {
  TP53: { length: 393, domains: [
    { name: "TAD", start: 6, end: 30, color: D[2] },
    { name: "P53 DNA-binding", start: 95, end: 288, color: D[0] },
    { name: "Tetramer", start: 318, end: 358, color: D[1] },
  ] },
  EGFR: { length: 1210, domains: [
    { name: "Recept_L", start: 57, end: 168, color: D[0] },
    { name: "Furin-like", start: 185, end: 338, color: D[2] },
    { name: "Recept_L", start: 361, end: 481, color: D[0] },
    { name: "Pkinase_Tyr", start: 712, end: 979, color: D[1] },
  ] },
  ERBB2: { length: 1255, domains: [
    { name: "Recept_L", start: 52, end: 169, color: D[0] },
    { name: "Furin-like", start: 182, end: 336, color: D[2] },
    { name: "Recept_L", start: 362, end: 480, color: D[0] },
    { name: "Pkinase_Tyr", start: 720, end: 987, color: D[1] },
  ] },
  KRAS: { length: 189, domains: [{ name: "Ras GTPase", start: 1, end: 166, color: D[0] }] },
  PIK3CA: { length: 1068, domains: [
    { name: "PI3K_p85B", start: 16, end: 105, color: D[2] },
    { name: "PI3K_rbd", start: 187, end: 289, color: D[3] },
    { name: "C2 PI3K", start: 330, end: 487, color: D[1] },
    { name: "PI3K accessory", start: 526, end: 696, color: D[4] },
    { name: "PI3/PI4 kinase", start: 797, end: 1047, color: D[0] },
  ] },
  BRCA1: { length: 1863, domains: [
    { name: "RING", start: 24, end: 64, color: D[2] },
    { name: "BRCT", start: 1642, end: 1736, color: D[0] },
    { name: "BRCT", start: 1756, end: 1855, color: D[0] },
  ] },
  PTEN: { length: 403, domains: [
    { name: "Phosphatase", start: 14, end: 185, color: D[0] },
    { name: "C2 tensin-type", start: 190, end: 350, color: D[1] },
  ] },
  ESR1: { length: 595, domains: [
    { name: "DNA-binding (zf)", start: 185, end: 250, color: D[2] },
    { name: "Ligand-binding", start: 307, end: 552, color: D[0] },
  ] },
  SMAD4: { length: 552, domains: [
    { name: "MH1", start: 10, end: 140, color: D[0] },
    { name: "MH2", start: 319, end: 552, color: D[1] },
  ] },
  FOXA1: { length: 472, domains: [{ name: "Forkhead", start: 168, end: 262, color: D[0] }] },
  AURKA: { length: 403, domains: [{ name: "Pkinase", start: 133, end: 383, color: D[1] }] },
  PRKCI: { length: 596, domains: [
    { name: "PB1", start: 25, end: 102, color: D[2] },
    { name: "Pkinase", start: 253, end: 521, color: D[1] },
  ] },
  NF1: { length: 2818, domains: [{ name: "RasGAP", start: 1198, end: 1530, color: D[0] }] },
  CDK12: { length: 1490, domains: [{ name: "Pkinase", start: 727, end: 1020, color: D[1] }] },
  MSH6: { length: 1360, domains: [
    { name: "PWWP", start: 90, end: 200, color: D[2] },
    { name: "MutS", start: 361, end: 1230, color: D[0] },
  ] },
  ARID1A: { length: 2285, domains: [{ name: "ARID", start: 1017, end: 1107, color: D[0] }] },
  ARID2: { length: 1835, domains: [{ name: "ARID", start: 8, end: 88, color: D[0] }] },
  SMARCA4: { length: 1647, domains: [
    { name: "HSA", start: 445, end: 570, color: D[2] },
    { name: "Helicase (SNF2)", start: 762, end: 1120, color: D[0] },
    { name: "Bromo", start: 1451, end: 1560, color: D[1] },
  ] },
  RB1: { length: 928, domains: [
    { name: "RB_A", start: 380, end: 580, color: D[0] },
    { name: "RB_B", start: 645, end: 785, color: D[1] },
  ] },
  CDKN2A: { length: 156, domains: [{ name: "Ankyrin", start: 10, end: 130, color: D[0] }] },
  KDR: { length: 1356, domains: [
    { name: "Ig-like x7", start: 46, end: 750, color: D[2] },
    { name: "Pkinase_Tyr", start: 834, end: 1162, color: D[1] },
  ] },
  MAP3K1: { length: 1512, domains: [{ name: "Pkinase", start: 1243, end: 1508, color: D[1] }] },
  TET2: { length: 2002, domains: [{ name: "Tet_JBP (2-OG-Fe)", start: 1290, end: 1905, color: D[0] }] },
  PRKDC: { length: 4128, domains: [{ name: "PI3/PI4 kinase", start: 3747, end: 4015, color: D[0] }] },
  IRS2: { length: 1338, domains: [
    { name: "PH", start: 12, end: 113, color: D[2] },
    { name: "PTB", start: 155, end: 264, color: D[0] },
  ] },
  DAXX: { length: 740, domains: [{ name: "DAXX central", start: 190, end: 400, color: D[0] }] },
};

/** Classify a protein-change string into a cBioPortal-style mutation class. */
export function classifyMutation(alteration: string): MutClass {
  const a = alteration.trim();
  if (/fs/i.test(a)) return "truncating"; // frameshift
  if (/\*$/.test(a) || /Ter$/i.test(a)) return "truncating"; // nonsense
  if (/(del|ins|dup)/i.test(a)) return "inframe";
  if (/splice|IVS/i.test(a)) return "other";
  if (/^[A-Za-z]\d+[A-Za-z*]/.test(a)) return "missense";
  return "other";
}

/** Extract the first amino-acid position from a protein-change string. */
export function proteinPosition(alteration: string): number | null {
  const m = alteration.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export interface Lollipop {
  pos: number; // aa
  alteration: string; // canonical label at this position (most actionable / recurrent)
  cls: MutClass;
  count: number; // # of samples with a mutation at this position
  escat: EscatTier; // most-actionable ESCAT tier seen here
  samples: string[]; // sample names for the tooltip
}

/** Rough per-gene protein length when the gene isn't curated. */
function fallbackLength(positions: number[]): number {
  const max = Math.max(0, ...positions);
  return Math.max(100, Math.ceil((max * 1.15) / 50) * 50);
}

const TIER_RANK: EscatTier[] = ["I", "II", "III", "IV", "X"];
const moreActionable = (a: EscatTier, b: EscatTier) =>
  TIER_RANK.indexOf(a) <= TIER_RANK.indexOf(b) ? a : b;

/** Build a lollipop set for one gene across one or many reports. */
export function buildLollipops(
  gene: string,
  reports: Report[],
): { model: ProteinModel; lollipops: Lollipop[] } | null {
  const byPos = new Map<number, Lollipop>();
  for (const r of reports) {
    for (const v of r.variants) {
      if (v.gene !== gene || v.kind !== "mutation") continue;
      const pos = proteinPosition(v.alteration);
      if (pos == null) continue;
      const cls = classifyMutation(v.alteration);
      const name = r.patient.name;
      const existing = byPos.get(pos);
      if (existing) {
        existing.count++;
        existing.samples.push(name);
        existing.escat = moreActionable(existing.escat, v.escat);
        // prefer the missense/most-actionable label for display
        if (moreActionable(v.escat, existing.escat) === v.escat) existing.alteration = v.alteration;
      } else {
        byPos.set(pos, { pos, alteration: v.alteration, cls, count: 1, escat: v.escat, samples: [name] });
      }
    }
  }
  const lollipops = [...byPos.values()].sort((a, b) => a.pos - b.pos);
  if (!lollipops.length) return null;
  const model = PROTEINS[gene] ?? { length: fallbackLength(lollipops.map((l) => l.pos)), domains: [] };
  return { model, lollipops };
}

/** Genes that carry at least one point mutation across the given reports. */
export function mutatedGenes(reports: Report[]): { gene: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const r of reports) {
    for (const v of r.variants) {
      if (v.kind !== "mutation" || proteinPosition(v.alteration) == null) continue;
      freq.set(v.gene, (freq.get(v.gene) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .map(([gene, count]) => ({ gene, count }))
    .sort((a, b) => b.count - a.count || a.gene.localeCompare(b.gene));
}

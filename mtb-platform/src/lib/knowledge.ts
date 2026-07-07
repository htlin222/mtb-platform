// ---------------------------------------------------------------------------
// A small, bundled actionability knowledge base (GRCh37 / hg19) used to
// annotate a client-parsed VCF live — no backend. A dropped variant that falls
// in an actionable gene's region is tagged with the gene; if it also matches a
// known hotspot locus, the specific alteration + ESCAT tier + drug light up.
//
// This is deliberately a curated subset — the full pipeline (VEP + OncoKB +
// CIViC + ESCAT) is what production runs. Region-based annotation is labelled
// as such so nothing is overstated.
// ---------------------------------------------------------------------------
import type { EscatTier } from "../types";

export interface GeneRegion {
  gene: string;
  chrom: string; // e.g. "chr7"
  start: number; // hg19
  end: number;
  tier: EscatTier; // representative actionability if hit in a driver context
  drugs: string[];
}

// ~25 recurrently-actionable genes, hg19 coordinates.
export const GENE_REGIONS: GeneRegion[] = [
  { gene: "EGFR", chrom: "chr7", start: 55086714, end: 55279321, tier: "I", drugs: ["Osimertinib", "Erlotinib"] },
  { gene: "KRAS", chrom: "chr12", start: 25357723, end: 25403870, tier: "II", drugs: ["Sotorasib", "Adagrasib"] },
  { gene: "NRAS", chrom: "chr1", start: 115247085, end: 115259515, tier: "III", drugs: ["MEK inhibitor (trial)"] },
  { gene: "BRAF", chrom: "chr7", start: 140419127, end: 140624564, tier: "I", drugs: ["Dabrafenib + Trametinib"] },
  { gene: "PIK3CA", chrom: "chr3", start: 178865902, end: 178957881, tier: "I", drugs: ["Alpelisib"] },
  { gene: "PTEN", chrom: "chr10", start: 89623195, end: 89728532, tier: "III", drugs: ["PI3K/AKT inhibitor (trial)"] },
  { gene: "TP53", chrom: "chr17", start: 7565097, end: 7590856, tier: "X", drugs: [] },
  { gene: "BRCA1", chrom: "chr17", start: 41196312, end: 41277500, tier: "I", drugs: ["Olaparib", "Niraparib"] },
  { gene: "BRCA2", chrom: "chr13", start: 32889617, end: 32973809, tier: "I", drugs: ["Olaparib", "Rucaparib"] },
  { gene: "ERBB2", chrom: "chr17", start: 37844167, end: 37886679, tier: "I", drugs: ["Trastuzumab deruxtecan"] },
  { gene: "ESR1", chrom: "chr6", start: 152011630, end: 152424409, tier: "I", drugs: ["Elacestrant"] },
  { gene: "IDH1", chrom: "chr2", start: 209100951, end: 209119806, tier: "I", drugs: ["Ivosidenib"] },
  { gene: "ALK", chrom: "chr2", start: 29415640, end: 30144432, tier: "I", drugs: ["Alectinib"] },
  { gene: "ROS1", chrom: "chr6", start: 117609463, end: 117747018, tier: "I", drugs: ["Crizotinib", "Entrectinib"] },
  { gene: "MET", chrom: "chr7", start: 116312459, end: 116438440, tier: "I", drugs: ["Capmatinib"] },
  { gene: "RET", chrom: "chr10", start: 43572517, end: 43625799, tier: "I", drugs: ["Selpercatinib"] },
  { gene: "KIT", chrom: "chr4", start: 55524085, end: 55606881, tier: "I", drugs: ["Imatinib"] },
  { gene: "FGFR2", chrom: "chr10", start: 123237844, end: 123357972, tier: "II", drugs: ["Erdafitinib (trial)"] },
  { gene: "FGFR3", chrom: "chr4", start: 1795039, end: 1810599, tier: "II", drugs: ["Erdafitinib"] },
  { gene: "CDK12", chrom: "chr17", start: 37617739, end: 37701159, tier: "III", drugs: ["PARP inhibitor (trial)"] },
  { gene: "ATM", chrom: "chr11", start: 108093559, end: 108239826, tier: "III", drugs: ["PARP inhibitor (trial)"] },
  { gene: "CCNE1", chrom: "chr19", start: 30302805, end: 30315215, tier: "II", drugs: ["CDK2 inhibitor (trial)"] },
  { gene: "MYC", chrom: "chr8", start: 128748315, end: 128753680, tier: "X", drugs: [] },
  { gene: "NF1", chrom: "chr17", start: 29421945, end: 29704695, tier: "III", drugs: ["MEK inhibitor (trial)"] },
  { gene: "APC", chrom: "chr5", start: 112043195, end: 112181936, tier: "X", drugs: [] },
];

// A handful of famous hotspot loci → specific alteration (hg19).
export interface Hotspot {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  gene: string;
  alteration: string;
  tier: EscatTier;
  drugs: string[];
}

export const HOTSPOTS: Hotspot[] = [
  { chrom: "chr7", pos: 140453136, ref: "A", alt: "T", gene: "BRAF", alteration: "V600E", tier: "I", drugs: ["Dabrafenib + Trametinib"] },
  { chrom: "chr7", pos: 55259515, ref: "T", alt: "G", gene: "EGFR", alteration: "L858R", tier: "I", drugs: ["Osimertinib"] },
  { chrom: "chr7", pos: 55249071, ref: "C", alt: "T", gene: "EGFR", alteration: "T790M", tier: "I", drugs: ["Osimertinib"] },
  { chrom: "chr12", pos: 25398285, ref: "C", alt: "A", gene: "KRAS", alteration: "G12C", tier: "II", drugs: ["Sotorasib", "Adagrasib"] },
  { chrom: "chr12", pos: 25398284, ref: "C", alt: "T", gene: "KRAS", alteration: "G12D", tier: "III", drugs: ["MRTX1133 (trial)"] },
  { chrom: "chr3", pos: 178952085, ref: "A", alt: "G", gene: "PIK3CA", alteration: "H1047R", tier: "I", drugs: ["Alpelisib"] },
  { chrom: "chr3", pos: 178936091, ref: "G", alt: "A", gene: "PIK3CA", alteration: "E545K", tier: "I", drugs: ["Alpelisib"] },
  { chrom: "chr2", pos: 209113112, ref: "C", alt: "T", gene: "IDH1", alteration: "R132H", tier: "I", drugs: ["Ivosidenib"] },
  { chrom: "chr17", pos: 7577121, ref: "G", alt: "A", gene: "TP53", alteration: "R273H", tier: "X", drugs: [] },
  { chrom: "chr17", pos: 7578406, ref: "C", alt: "T", gene: "TP53", alteration: "R175H", tier: "X", drugs: [] },
];

const norm = (c: string) => (c.startsWith("chr") ? c : `chr${c}`);

/** Match a parsed variant to a hotspot (exact) then a gene region. */
export function annotateLocus(chrom: string, pos: number, ref: string, alt: string) {
  const c = norm(chrom);
  const hs = HOTSPOTS.find((h) => h.chrom === c && h.pos === pos && h.ref === ref && h.alt === alt);
  if (hs) return { gene: hs.gene, alteration: hs.alteration, tier: hs.tier, drugs: hs.drugs, kind: "hotspot" as const };
  const reg = GENE_REGIONS.find((g) => g.chrom === c && pos >= g.start && pos <= g.end);
  if (reg) return { gene: reg.gene, alteration: `${c}:${pos} ${ref}>${alt}`, tier: reg.tier, drugs: reg.drugs, kind: "gene-region" as const };
  return null;
}

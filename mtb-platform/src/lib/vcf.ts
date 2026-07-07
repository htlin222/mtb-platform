// ---------------------------------------------------------------------------
// Client-side VCF parser. Reads a dropped/selected .vcf (text) entirely in the
// browser — proving the platform ingests the user's real file with no backend.
// Extracts PASS variants with locus, ref/alt, allele fraction and germline flag,
// then annotates each against the bundled hg19 knowledge base.
// ---------------------------------------------------------------------------
import { annotateLocus } from "./knowledge";
import type { EscatTier } from "../types";

export interface ParsedVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  af: number | null; // allele fraction
  dp: number | null; // depth
  germline: boolean;
  // annotation (region/hotspot) — null if outside known actionable genes
  gene?: string;
  alteration?: string;
  tier?: EscatTier;
  drugs?: string[];
  annKind?: "hotspot" | "gene-region";
}

export interface ParseResult {
  filename: string;
  total: number; // PASS records
  somatic: number;
  variants: ParsedVariant[]; // annotated subset kept first, then the rest (capped)
  actionable: ParsedVariant[]; // tier I/II annotated
  reference: string; // detected reference build
}

function detectRef(headerLines: string[]): string {
  const contig = headerLines.find((l) => l.startsWith("##contig=<ID=chr1,"));
  if (contig?.includes("249250621")) return "GRCh37 / hg19";
  if (contig?.includes("248956422")) return "GRCh38 / hg38";
  return "unknown";
}

function fmtValue(format: string, sample: string, key: string): string | null {
  const keys = format.split(":");
  const vals = sample.split(":");
  const i = keys.indexOf(key);
  return i >= 0 && i < vals.length ? vals[i] : null;
}

export function parseVcf(text: string, filename: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const header = lines.filter((l) => l.startsWith("##"));
  const reference = detectRef(header);

  const annotated: ParsedVariant[] = [];
  const rest: ParsedVariant[] = [];
  let total = 0;
  let somatic = 0;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const f = line.split("\t");
    if (f.length < 8) continue;
    const [chrom, posStr, , ref, altField, , filter, info, format, sample] = f;
    if (filter && filter !== "PASS" && filter !== ".") continue;
    const alt = (altField || "").split(",")[0];
    if (!alt || alt === "." || alt === "<NON_REF>") continue;
    const pos = Number(posStr);
    if (!Number.isFinite(pos)) continue;
    total++;

    const germline = /GermlineStatus=Germline/i.test(info || "");
    if (!germline) somatic++;

    let af: number | null = null;
    let dp: number | null = null;
    if (format && sample) {
      const afStr = fmtValue(format, sample, "AF");
      af = afStr != null ? Number(afStr.split(",")[0]) : null;
      const dpStr = fmtValue(format, sample, "DP");
      dp = dpStr != null ? Number(dpStr) : null;
    }
    if (dp == null) {
      const m = (info || "").match(/(?:^|;)DP=(\d+)/);
      if (m) dp = Number(m[1]);
    }

    const v: ParsedVariant = { chrom, pos, ref, alt, af, dp, germline };
    const ann = annotateLocus(chrom, pos, ref, alt);
    if (ann) {
      v.gene = ann.gene; v.alteration = ann.alteration; v.tier = ann.tier;
      v.drugs = ann.drugs; v.annKind = ann.kind;
      annotated.push(v);
    } else {
      rest.push(v);
    }
  }

  // annotated first (sorted by tier), then a capped sample of the rest
  const tierRank: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, X: 4 };
  annotated.sort((a, b) => (tierRank[a.tier ?? "X"] ?? 9) - (tierRank[b.tier ?? "X"] ?? 9));
  const variants = [...annotated, ...rest].slice(0, 400);
  const actionable = annotated.filter((v) => v.tier === "I" || v.tier === "II");

  return { filename, total, somatic, variants, actionable, reference };
}

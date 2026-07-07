// Turn a report's variants into IGV.js annotation features, placing each at its
// hg19 locus (exact hotspot position when known, else the gene-region midpoint).
import type { Report, EscatTier } from "../types";
import { GENE_REGIONS, HOTSPOTS } from "./knowledge";

const TIER_COLOR: Record<EscatTier, string> = {
  I: "#108548", // green
  II: "#1f75cb", // blue
  III: "#c17d10", // amber
  IV: "#89888d", // grey
  X: "#bfbfc3", // light grey
};

export interface IgvFeature { chr: string; start: number; end: number; name: string; color: string }

/** Feature list + a sensible default locus (the top actionable finding). */
export function reportToIgv(report: Report): { features: IgvFeature[]; locus: string } {
  const features: IgvFeature[] = [];
  let topLocus = "";

  for (const v of report.variants) {
    const hs = HOTSPOTS.find((h) => h.gene === v.gene && h.alteration === v.alteration);
    const reg = GENE_REGIONS.find((g) => g.gene === v.gene);
    let chr = "", pos = 0;
    if (hs) { chr = hs.chrom; pos = hs.pos; }
    else if (reg) { chr = reg.chrom; pos = Math.round((reg.start + reg.end) / 2); }
    else continue;

    features.push({
      chr, start: pos - 1, end: pos,
      name: `${v.gene} ${v.alteration} (${v.escat})`,
      color: TIER_COLOR[v.escat] ?? "#bfbfc3",
    });
    if (!topLocus && (v.escat === "I" || v.escat === "II")) {
      const g = reg ?? GENE_REGIONS.find((x) => x.gene === v.gene);
      if (g) topLocus = `${g.chrom}:${Math.max(1, g.start - 2000)}-${g.end + 2000}`;
      else if (hs) topLocus = `${hs.chrom}:${hs.pos - 3000}-${hs.pos + 3000}`;
    }
  }

  // fall back to first feature's neighbourhood, else a default gene
  if (!topLocus) {
    if (features.length) {
      const f = features[0];
      topLocus = `${f.chr}:${f.start - 3000}-${f.end + 3000}`;
    } else {
      topLocus = "chr7:55086714-55279321"; // EGFR
    }
  }
  return { features, locus: topLocus };
}

export function igvTrack(name: string, features: IgvFeature[]) {
  return {
    name,
    type: "annotation",
    displayMode: "EXPANDED",
    height: 44,
    features: features.map((f) => ({ chr: f.chr, start: f.start, end: f.end, name: f.name, color: f.color })),
  } as { name: string; type: string; features: unknown[]; height: number; displayMode: string };
}

export type CitationStyle = "ama" | "vancouver" | "apa";
export interface CiteSource {
  authors: string; title: string; journal: string; year: string;
  pmid?: string; doi?: string; volume?: string; issue?: string; pages?: string;
}

function authorList(raw: string): string {
  const parts = raw.split(",").map((a) => a.trim()).filter(Boolean);
  if (parts.length <= 6) return parts.join(", ");
  return parts.slice(0, 6).join(", ") + ", et al";
}
function volInfo(s: CiteSource): string {
  if (!s.volume) return "";
  const iss = s.issue ? `(${s.issue})` : "";
  const pg = s.pages ? `:${s.pages}` : "";
  return `;${s.volume}${iss}${pg}`;
}
function title(s: CiteSource): string {
  return s.title.replace(/\.\s*$/, "");
}

export function formatCitation(s: CiteSource, style: CitationStyle = "ama"): string {
  const pmid = s.pmid ? `PMID: ${s.pmid}` : "";
  if (style === "apa") {
    const vol = s.volume ? `, ${s.volume}${s.issue ? `(${s.issue})` : ""}${s.pages ? `, ${s.pages}` : ""}` : "";
    return [`${authorList(s.authors)} (${s.year}). ${title(s)}. ${s.journal}${vol}.`, pmid].filter(Boolean).join(" ").trim();
  }
  // ama & vancouver share the core; vancouver ends with a period after PMID
  const core = `${authorList(s.authors)}. ${title(s)}. ${s.journal}. ${s.year}${volInfo(s)}.`;
  if (style === "vancouver") return pmid ? `${core} ${pmid}.` : core;
  return pmid ? `${core} ${pmid}` : core;
}

export function mybibUrl(s: CiteSource): string {
  const id = s.doi || s.pmid || s.title;
  return `https://www.mybib.com/tools/ama-citation-generator?q=${encodeURIComponent(id)}`;
}

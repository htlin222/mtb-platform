import type { Report, LiteratureHit } from "../types";
import { GlCard, GlBadge, ExternalLinkIcon } from "./gl";

export default function LiteratureTab({ report }: { report: Report }) {
  if (report.literature.length === 0) {
    return <p className="gl-text-muted">No literature retrieved for this report.</p>;
  }
  const byGene = new Map<string, LiteratureHit[]>();
  for (const h of report.literature) {
    const g = h.gene || "General";
    if (!byGene.has(g)) byGene.set(g, []);
    byGene.get(g)!.push(h);
  }

  return (
    <div className="gl-col">
      <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
        {report.literature.length} PubMed records retrieved for this patient's alterations.
      </p>
      {[...byGene.entries()].map(([gene, hits]) => (
        <GlCard key={gene} header={<><span className="mono">{gene}</span> <GlBadge variant="neutral">{hits.length}</GlBadge></>}>
          <div className="gl-col" style={{ gap: 12 }}>
            {hits.map((h, i) => (
              <div key={h.pmid} style={{ paddingBottom: 12, borderBottom: i < hits.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="gl-strong gl-text-sm">{h.title}</div>
                <div className="gl-text-xs gl-text-muted">
                  {h.authors} · <em>{h.journal}</em> · {h.year}
                </div>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`} target="_blank" rel="noreferrer"
                  className="mono gl-text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  PMID {h.pmid} <ExternalLinkIcon size={12} />
                </a>
              </div>
            ))}
          </div>
        </GlCard>
      ))}
    </div>
  );
}

import type { Report, LiteratureHit } from "../types";
import { GlCard, GlBadge } from "./gl";
import KnowledgeCard from "./KnowledgeCard";

export default function LiteratureTab({ report }: { report: Report }) {
  // Gene-centric: every annotated variant becomes a PICO knowledge card. A real
  // systematic-review appraisal is used when one exists; otherwise the card
  // derives a PICO from the variant + the gene's PubMed hits.
  const findAppraisal = (gene: string, alteration: string) =>
    report.appraisals.find((a) => a.linkedGene === gene && a.linkedAlteration === alteration);
  const hitsFor = (gene: string) => report.literature.filter((h) => h.gene === gene);

  // Raw retrieval grouped by gene (kept as a collapsible reference).
  const byGene = new Map<string, LiteratureHit[]>();
  for (const h of report.literature) {
    const g = h.gene || "General";
    if (!byGene.has(g)) byGene.set(g, []);
    byGene.get(g)!.push(h);
  }

  return (
    <div className="gl-col">
      {/* Per-gene PICO knowledge (robust-lit-review) */}
      <div className="gl-section-title" style={{ marginBottom: 4 }}>
        Evidence knowledge · PICO + PRISMA + GRADE
      </div>
      <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 8px" }}>
        Each annotated alteration becomes a PICO question — appraised as a systematic review
        when evidence allows, otherwise derived from the retrieved literature. Run the
        robust-lit-review pipeline for a live evidence synthesis.
      </p>
      {report.variants.map((v) => (
        <KnowledgeCard
          key={`${v.gene} ${v.alteration}`}
          variant={v}
          appraisal={findAppraisal(v.gene, v.alteration)}
          literature={hitsFor(v.gene)}
          cancerType={report.patient.cancerType}
          patient={report.patient.chartNo}
        />
      ))}

      {/* Raw retrieval reference */}
      <details className="gl-disclosure" style={{ marginTop: 8 }}>
        <summary className="gl-section-title" style={{ cursor: "pointer" }}>
          PubMed retrieval · {report.literature.length} records
        </summary>
        <div className="gl-col" style={{ marginTop: 10 }}>
          {[...byGene.entries()].map(([gene, hits]) => (
            <GlCard key={gene} header={<><span className="mono">{gene}</span> <GlBadge variant="neutral">{hits.length}</GlBadge></>}>
              <div className="gl-col" style={{ gap: 12 }}>
                {hits.map((h, i) => (
                  <div key={h.pmid} style={{ paddingBottom: 12, borderBottom: i < hits.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div className="gl-strong gl-text-sm">{h.title}</div>
                    <div className="gl-text-xs gl-text-muted">{h.authors} · <em>{h.journal}</em> · {h.year}</div>
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`} target="_blank" rel="noreferrer"
                      className="mono gl-text-xs" style={{ marginTop: 4, display: "inline-block" }}>
                      PMID {h.pmid}
                    </a>
                  </div>
                ))}
              </div>
            </GlCard>
          ))}
        </div>
      </details>
    </div>
  );
}

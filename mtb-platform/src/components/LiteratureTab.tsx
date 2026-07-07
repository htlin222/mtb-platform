import type { Report, LiteratureHit, Appraisal } from "../types";
import { GRADE_META, PROVENANCE_META, ESCAT_META } from "../lib/format";
import { GlCard, GlBadge, ExternalLinkIcon } from "./gl";

export default function LiteratureTab({ report }: { report: Report }) {
  const byGene = new Map<string, LiteratureHit[]>();
  for (const h of report.literature) {
    const g = h.gene || "General";
    if (!byGene.has(g)) byGene.set(g, []);
    byGene.get(g)!.push(h);
  }

  return (
    <div className="gl-col">
      {/* Systematic-review appraisals (robust-lit-review) */}
      {report.appraisals.length > 0 && (
        <div className="gl-col">
          <div className="gl-section-title" style={{ marginBottom: 4 }}>
            Evidence appraisal · PRISMA + GRADE
          </div>
          <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 8px" }}>
            Each actionable finding is appraised as a systematic review — PICO question, PRISMA
            selection flow, GRADE certainty, and the verified included studies.
          </p>
          {report.appraisals.map((a) => <AppraisalCard key={a.id} a={a} />)}
        </div>
      )}

      {/* Raw retrieval */}
      <div className="gl-section-title" style={{ marginTop: 8 }}>
        PubMed retrieval · {report.literature.length} records
      </div>
      {[...byGene.entries()].map(([gene, hits]) => (
        <GlCard key={gene} header={<><span className="mono">{gene}</span> <GlBadge variant="neutral">{hits.length}</GlBadge></>}>
          <div className="gl-col" style={{ gap: 12 }}>
            {hits.map((h, i) => (
              <div key={h.pmid} style={{ paddingBottom: 12, borderBottom: i < hits.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="gl-strong gl-text-sm">{h.title}</div>
                <div className="gl-text-xs gl-text-muted">{h.authors} · <em>{h.journal}</em> · {h.year}</div>
                <PmidLink pmid={h.pmid} />
              </div>
            ))}
          </div>
        </GlCard>
      ))}
    </div>
  );
}

function AppraisalCard({ a }: { a: Appraisal }) {
  const grade = GRADE_META[a.grade];
  const prov = PROVENANCE_META[a.provenance];
  const p = a.prisma;
  const max = p.totalFound || 1;
  const rows: { label: string; value: number; included?: boolean }[] = [
    { label: "Records found", value: p.totalFound },
    { label: "After de-duplication", value: p.afterDedup },
    { label: "After year filter", value: p.afterYearFilter },
    { label: "After quality (Q1)", value: p.afterQuality },
    { label: "Included", value: p.included, included: true },
  ];

  return (
    <GlCard
      header={
        <div className="gl-row gl-center gl-wrap" style={{ gap: 8, width: "100%" }}>
          <span className="mono gl-strong">{a.linkedGene}</span>
          <span className="mono gl-text-muted">{a.linkedAlteration}</span>
          <GlBadge variant={ESCAT_META[a.escat].variant}>{ESCAT_META[a.escat].short}</GlBadge>
          <span className="gl-grow" />
          <GlBadge variant={prov.variant}>{prov.label}</GlBadge>
          <GlBadge variant={grade.variant}>{grade.label}</GlBadge>
        </div>
      }
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.verdict}</div>
      <p className="gl-text-sm gl-text-secondary" style={{ margin: "0 0 14px" }}>{a.pico.question}</p>

      {/* PICO */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 16, rowGap: 4, marginBottom: 16 }}>
        <Pico k="Population" v={a.pico.population} />
        <Pico k="Intervention" v={a.pico.intervention} />
        <Pico k="Comparator" v={a.pico.comparator} />
        <Pico k="Outcome" v={a.pico.outcome} />
      </div>

      {/* PRISMA funnel */}
      <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>PRISMA 2020 selection</div>
      <div className="gl-funnel" style={{ marginBottom: 16 }}>
        {rows.map((r) => (
          <div className="gl-funnel-row" key={r.label}>
            <span className="gl-funnel-label">{r.label}</span>
            <span className="gl-funnel-track">
              <span className={`gl-funnel-bar${r.included ? " included" : ""}`} style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }}>
                {r.value}
              </span>
            </span>
          </div>
        ))}
        <div className="gl-funnel-row">
          <span className="gl-funnel-label" />
          <span className="gl-funnel-excl">{p.excludedByQuality} excluded at quality screening</span>
        </div>
      </div>

      {/* Included studies */}
      <details className="gl-disclosure">
        <summary className="gl-link-button" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          Included studies ({a.includedStudies.length})
        </summary>
        <div className="gl-col" style={{ gap: 10, marginTop: 10 }}>
          {a.includedStudies.map((s, i) => (
            <div key={s.pmid + i} style={{ paddingBottom: 10, borderBottom: i < a.includedStudies.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="gl-row gl-center" style={{ gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                <GlBadge variant={s.quartile === "Q1" ? "success" : "neutral"}>{s.quartile}</GlBadge>
                {s.verified && <GlBadge variant="info">Verified</GlBadge>}
                {s.openAccess && <GlBadge variant="neutral">Open access</GlBadge>}
                <span className="gl-text-xs gl-text-muted">{s.citationCount} citations</span>
              </div>
              <div className="gl-strong gl-text-sm">{s.title}</div>
              <div className="gl-text-xs gl-text-muted">{s.authors} · <em>{s.journal}</em> · {s.year}</div>
              <PmidLink pmid={s.pmid} />
            </div>
          ))}
        </div>
      </details>
    </GlCard>
  );
}

function Pico({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="gl-text-xs gl-text-muted" style={{ whiteSpace: "nowrap" }}>{k}</span>
      <span className="gl-text-sm">{v}</span>
    </>
  );
}

function PmidLink({ pmid }: { pmid: string }) {
  return (
    <a href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noreferrer"
      className="mono gl-text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
      PMID {pmid} <ExternalLinkIcon size={12} />
    </a>
  );
}

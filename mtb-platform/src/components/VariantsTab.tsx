import type { Report, Variant } from "../types";
import { ESCAT_META, ESCAT_ORDER, KIND_LABEL, levelSense } from "../lib/format";
import { GlBadge, ChevronRightIcon } from "./gl";
import Markdown from "./Markdown";

export default function VariantsTab({ report }: { report: Report }) {
  const sorted = [...report.variants].sort(
    (a, b) => ESCAT_ORDER.indexOf(a.escat) - ESCAT_ORDER.indexOf(b.escat),
  );
  return (
    <div className="gl-col">
      <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
        {report.variants.length} clinically annotated alterations, ranked by ESCAT actionability.
        {report.droppedVus > 0 && ` ${report.droppedVus} variant(s) of unknown significance filtered.`}
      </p>
      {sorted.map((v) => (
        <VariantRow key={`${v.gene}-${v.alteration}`} v={v} />
      ))}
    </div>
  );
}

function VariantRow({ v }: { v: Variant }) {
  const meta = ESCAT_META[v.escat];
  const hasDetail = !!v.narrative || v.treatments.length > 0;
  const head = (
    <div className="gl-row gl-center gl-wrap" style={{ gap: 12, padding: 16 }}>
      {hasDetail && <span className="gl-chevron"><ChevronRightIcon /></span>}
      <span style={{ minWidth: 150 }}>
        <span className="mono gl-strong" style={{ fontSize: 15 }}>{v.gene}</span>{" "}
        <span className="mono gl-text-muted">{v.alteration}</span>
      </span>
      <GlBadge variant="neutral">{KIND_LABEL[v.kind]}</GlBadge>
      <span className="gl-text-sm gl-text-muted gl-grow">{v.oncogenicity}</span>
      {v.oncokbLevel && <span className="mono gl-text-xs gl-text-muted">{v.oncokbLevel}</span>}
      <GlBadge variant={meta.variant} title={meta.label}>{meta.short}</GlBadge>
    </div>
  );

  return (
    <div className="gl-card">
      {hasDetail ? (
        <details className="gl-disclosure">
          <summary>{head}</summary>
          <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
            {v.mutationEffect && (
              <p className="gl-text-sm gl-text-muted" style={{ margin: "0 0 8px" }}>
                Mutation effect: {v.mutationEffect} · {meta.label}
              </p>
            )}
            {v.narrative ? (
              <Markdown source={v.narrative} />
            ) : (
              <div className="gl-col" style={{ gap: 8 }}>
                {v.treatments.map((t, i) => (
                  <div key={i} className="gl-row gl-center gl-wrap" style={{ gap: 8 }}>
                    <span className="gl-strong gl-text-sm">{t.drugs}</span>
                    <span className="mono gl-text-xs gl-text-muted">{t.level}</span>
                    <span className="gl-text-xs gl-text-muted">{levelSense(t.level)}</span>
                    {t.fdaApproved && <GlBadge variant="success">FDA-approved</GlBadge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      ) : (
        head
      )}
    </div>
  );
}

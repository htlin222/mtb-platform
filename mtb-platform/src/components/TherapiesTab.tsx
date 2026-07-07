import type { Report } from "../types";
import { ESCAT_META, levelSense } from "../lib/format";
import { GlCard, GlBadge } from "./gl";

interface Row {
  gene: string; alteration: string; escat: keyof typeof ESCAT_META;
  drugs: string; level: string; fdaApproved: boolean; description: string;
}

export default function TherapiesTab({ report }: { report: Report }) {
  const rows: Row[] = [];
  for (const v of report.variants) {
    for (const t of v.treatments) {
      rows.push({
        gene: v.gene, alteration: v.alteration, escat: v.escat,
        drugs: t.drugs, level: t.level, fdaApproved: t.fdaApproved, description: t.description,
      });
    }
  }
  const levelRank = (l: string) => Number(l.replace(/[^0-9]/g, "")) || 9;
  rows.sort((a, b) => levelRank(a.level) - levelRank(b.level));

  if (rows.length === 0) {
    return <p className="gl-text-muted">No OncoKB-matched therapies for this report.</p>;
  }

  return (
    <div className="gl-col">
      <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
        {rows.length} OncoKB-matched therapy annotations, ranked by evidence level.
      </p>
      {rows.map((r, i) => (
        <GlCard key={i}>
          <div className="gl-row gl-center gl-wrap" style={{ gap: 8, marginBottom: r.description ? 8 : 0 }}>
            <span className="gl-strong" style={{ fontSize: 15 }}>{r.drugs}</span>
            <span className="mono gl-text-xs gl-text-muted">{r.level}</span>
            <span className="gl-text-xs gl-text-muted">{levelSense(r.level)}</span>
            {r.fdaApproved && <GlBadge variant="success">FDA-approved</GlBadge>}
            <span className="gl-grow" />
            <GlBadge variant={ESCAT_META[r.escat].variant}>{ESCAT_META[r.escat].short}</GlBadge>
            <span className="mono gl-text-sm">
              <span className="gl-strong">{r.gene}</span> <span className="gl-text-muted">{r.alteration}</span>
            </span>
          </div>
          {r.description && (
            <p className="gl-text-xs gl-text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {truncate(r.description, 320)}
            </p>
          )}
        </GlCard>
      ))}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
}

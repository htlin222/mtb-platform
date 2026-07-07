import { useMemo, useState } from "react";
import type { Report } from "../types";
import {
  buildLollipops, MUT_COLOR, MUT_LABEL, type MutClass, type Lollipop,
} from "../lib/mutationMapper";

// A cBioPortal-style Mutation Mapper lollipop plot, styled with GitLab Pajamas
// tokens. Draws a protein backbone with Pfam-style domains and a lollipop at
// each mutated residue; stick height and head size scale with recurrence, and
// Tier I–II residues get a ring. Works for a single report or a whole cohort.
export default function LollipopPlot({
  gene, reports, height = 168,
}: { gene: string; reports: Report[]; height?: number }) {
  const built = useMemo(() => buildLollipops(gene, reports), [gene, reports]);
  const [hover, setHover] = useState<Lollipop | null>(null);
  if (!built) return null;
  const { model, lollipops } = built;

  // ── geometry ──────────────────────────────────────────────────────────────
  const PAD_L = 8, PAD_R = 8, W = 640;
  const plotW = W - PAD_L - PAD_R;
  const axisY = height - 30; // protein backbone baseline
  const trackH = 14; // backbone thickness
  const maxCount = Math.max(...lollipops.map((l) => l.count));
  const headMax = axisY - 24; // tallest a stick may reach
  const x = (aa: number) => PAD_L + (aa / model.length) * plotW;
  const stickTop = (c: number) => axisY - trackH / 2 - 14 - ((c / maxCount) * (headMax - 40));
  const headR = (c: number) => 5 + (c / maxCount) * 5;

  const usedClasses = Array.from(new Set(lollipops.map((l) => l.cls))) as MutClass[];
  const ticks = axisTicks(model.length);

  return (
    <div>
      <div style={{ position: "relative", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", minWidth: 480 }}
          role="img" aria-label={`${gene} mutation lollipop plot`}>
          {/* backbone */}
          <rect x={PAD_L} y={axisY - trackH / 2} width={plotW} height={trackH} rx={3}
            fill="var(--gray-100)" />
          {/* domains */}
          {model.domains.map((dm, i) => (
            <g key={i}>
              <rect x={x(dm.start)} y={axisY - trackH / 2 - 3} width={x(dm.end) - x(dm.start)}
                height={trackH + 6} rx={4} fill={dm.color} stroke="var(--border-strong)" strokeWidth={1} />
              {x(dm.end) - x(dm.start) > 34 && (
                <text x={(x(dm.start) + x(dm.end)) / 2} y={axisY + 4} textAnchor="middle"
                  fontSize={9} fontWeight={600} fill="var(--text-secondary)">{dm.name}</text>
              )}
            </g>
          ))}
          {/* axis ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={axisY + trackH / 2} y2={axisY + trackH / 2 + 4} stroke="var(--border-strong)" />
              <text x={x(t)} y={axisY + trackH / 2 + 15} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{t}</text>
            </g>
          ))}
          <text x={PAD_L + plotW} y={axisY + trackH / 2 + 15} textAnchor="end" fontSize={9} fill="var(--text-muted)">
            {model.length} aa
          </text>

          {/* lollipops */}
          {lollipops.map((l) => {
            const cx = x(l.pos), top = stickTop(l.count), r = headR(l.count);
            const actionable = l.escat === "I" || l.escat === "II";
            return (
              <g key={l.pos} style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(l)} onMouseLeave={() => setHover(null)}>
                <line x1={cx} x2={cx} y1={axisY - trackH / 2} y2={top} stroke="var(--border-strong)" strokeWidth={1.4} />
                {actionable && <circle cx={cx} cy={top} r={r + 2.5} fill="none" stroke="var(--gray-950)" strokeWidth={1.5} />}
                <circle cx={cx} cy={top} r={r} fill={MUT_COLOR[l.cls]} stroke="#fff" strokeWidth={1} />
                {l.count > 1 && <text x={cx} y={top + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">{l.count}</text>}
              </g>
            );
          })}
        </svg>

        {hover && (
          <div className="gl-card" style={{
            position: "absolute", top: 4, left: 8, zIndex: 5, padding: "8px 10px",
            boxShadow: "var(--shadow-md, 0 2px 8px rgba(0,0,0,.15))", maxWidth: 260, pointerEvents: "none",
          }}>
            <div className="gl-row gl-center" style={{ gap: 6 }}>
              <i style={{ width: 9, height: 9, borderRadius: "50%", background: MUT_COLOR[hover.cls], display: "inline-block" }} />
              <span className="mono gl-strong">{gene} {hover.alteration}</span>
            </div>
            <div className="gl-text-xs gl-text-muted" style={{ marginTop: 3 }}>
              {MUT_LABEL[hover.cls]} · residue {hover.pos} · ESCAT {hover.escat}
            </div>
            <div className="gl-text-xs gl-text-muted" style={{ marginTop: 2 }}>
              {hover.count} sample{hover.count > 1 ? "s" : ""}: {hover.samples.slice(0, 4).join(", ")}
              {hover.samples.length > 4 ? ` +${hover.samples.length - 4}` : ""}
            </div>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="gl-batch-legend" style={{ marginTop: 6 }}>
        {usedClasses.map((c) => (
          <span key={c} className="gl-legend-dot"><i style={{ background: MUT_COLOR[c], borderRadius: "50%" }} />{MUT_LABEL[c]}</span>
        ))}
        <span className="gl-legend-dot"><i style={{ background: "transparent", boxShadow: "inset 0 0 0 1.5px var(--gray-950)", borderRadius: "50%" }} />Tier I–II</span>
      </div>
    </div>
  );
}

// Nice round axis ticks across the protein length.
function axisTicks(len: number): number[] {
  const step = len <= 200 ? 50 : len <= 600 ? 100 : len <= 1500 ? 250 : len <= 3000 ? 500 : 1000;
  const out: number[] = [0];
  for (let t = step; t < len; t += step) out.push(t);
  return out;
}

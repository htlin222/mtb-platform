import { useMemo } from "react";
import type { Report } from "../types";
import { buildOncoprint, ALT_COLOR, ALT_LABEL, type AltType } from "../lib/oncoprint";

// Sample matrix / oncoprint (genes × samples), inspired by the ASH HematOmics
// Program (ASHOP) Sample Matrix. Columns grouped by cancer type, cells coloured
// by alteration type, a top rule marks Tier I–II actionability.
export default function Oncoprint({ reports }: { reports: Report[] }) {
  const op = useMemo(() => buildOncoprint(reports), [reports]);
  if (!op.genes.length) return null;

  // group columns by cancer type for header spans
  const groups: { cancer: string; span: number }[] = [];
  for (const s of op.samples) {
    const last = groups[groups.length - 1];
    if (last && last.cancer === s.cancerType) last.span++;
    else groups.push({ cancer: s.cancerType, span: 1 });
  }

  const CELL = 30, GENE_W = 74, FREQ_W = 40;
  const usedTypes = Array.from(new Set(
    op.genes.flatMap((g) => Object.values(op.matrix[g] ?? {}).flatMap((c) => c.alts.map((a) => a.type))),
  )) as AltType[];

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            {/* cancer-type group header */}
            <tr>
              <th style={{ width: GENE_W }} />
              <th style={{ width: FREQ_W }} />
              {groups.map((g, i) => (
                <th key={i} colSpan={g.span} style={{ padding: "2px 4px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "2px solid var(--border-strong)", whiteSpace: "nowrap" }}>
                  {g.cancer.replace(/,.*$/, "")}
                </th>
              ))}
            </tr>
            {/* sample names */}
            <tr>
              <th />
              <th style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textAlign: "right", paddingRight: 6 }}>alt</th>
              {op.samples.map((s) => (
                <th key={s.chartNo} style={{ width: CELL, height: 90, verticalAlign: "bottom", padding: 0 }}>
                  <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 11, color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap", margin: "0 auto" }}>
                    {s.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {op.genes.map((gene) => (
              <tr key={gene}>
                <td className="mono" style={{ fontWeight: 700, paddingRight: 8, textAlign: "right", whiteSpace: "nowrap" }}>{gene}</td>
                <td style={{ paddingRight: 6 }}>
                  <span className="gl-text-xs gl-text-muted">{op.freq[gene]}</span>
                </td>
                {op.samples.map((s) => {
                  const cell = op.matrix[gene]?.[s.chartNo];
                  const alt = cell?.alts[0];
                  const actionable = cell?.alts.some((a) => a.escat === "I" || a.escat === "II");
                  return (
                    <td key={s.chartNo} style={{ padding: 1 }}>
                      <div
                        title={cell ? `${gene} · ${cell.alts.map((a) => `${a.alteration} (${a.type}, ${a.escat})`).join("; ")}` : ""}
                        style={{
                          width: CELL - 4, height: CELL - 8, margin: "0 auto", borderRadius: 2,
                          background: alt ? ALT_COLOR[alt.type] : "var(--gray-50)",
                          boxShadow: actionable ? "inset 0 0 0 2px var(--gray-950)" : undefined,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div className="gl-batch-legend" style={{ marginTop: 12 }}>
        {usedTypes.map((t) => (
          <span key={t} className="gl-legend-dot"><i style={{ background: ALT_COLOR[t] }} />{ALT_LABEL[t]}</span>
        ))}
        <span className="gl-legend-dot"><i style={{ background: "var(--gray-50)", boxShadow: "inset 0 0 0 2px var(--gray-950)" }} />Tier I–II actionable</span>
      </div>
    </div>
  );
}

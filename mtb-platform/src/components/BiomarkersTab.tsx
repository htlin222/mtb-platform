import type { Report } from "../types";
import { biomarkerPositive } from "../lib/format";
import { GlCard, GlBadge } from "./gl";

export default function BiomarkersTab({ report }: { report: Report }) {
  const b = report.biomarkers;
  return (
    <div className="gl-col">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatTile label="TMB" value={String(b.tmb)} unit="mut/Mb"
          signal={biomarkerPositive("tmb", b)} signalText={b.tmbClass}
          sub={`${b.variantCount} variants · ${b.panelSizeMb} Mb`} />
        <StatTile label="MSI" value={b.msi}
          signal={biomarkerPositive("msi", b)} signalText={b.msi}
          sub={`${b.unstableSites}/${b.totalSites} unstable · score ${b.msiScore}`} />
        <StatTile label="HRD" value={String(b.hrd)}
          signal={biomarkerPositive("hrd", b)} signalText={b.hrdStatus}
          sub={b.hrdReliable ? "reliable" : "low tumour fraction"} />
      </div>

      <GlCard header="HRD components">
        <div className="gl-row" style={{ gap: 40, flexWrap: "wrap" }}>
          <Component label="LOH" value={b.loh} />
          <Component label="TAI" value={b.tai} />
          <Component label="LST" value={b.lst} />
        </div>
        <p className="gl-text-xs gl-text-muted" style={{ marginTop: 16, marginBottom: 0 }}>
          Genomic-scar HRD score is the sum of loss-of-heterozygosity (LOH), telomeric allelic
          imbalance (TAI), and large-scale state transitions (LST).
          {!b.hrdReliable && " Interpret with caution — tumour fraction was low."}
        </p>
      </GlCard>

      {report.cnv.length > 0 && (
        <div>
          <div className="gl-section-title">Copy-number alterations</div>
          <div className="gl-table-card">
            <table className="gl-table">
              <thead>
                <tr><th>Gene</th><th>Type</th><th>Copies</th><th>log2 ratio</th><th>Locus</th></tr>
              </thead>
              <tbody>
                {report.cnv.map((c, i) => (
                  <tr key={i}>
                    <td className="mono gl-strong">{c.gene}</td>
                    <td><GlBadge variant="neutral">{c.type}</GlBadge></td>
                    <td className="mono">{c.copyNumber}</td>
                    <td className="mono gl-text-muted">{c.log2}</td>
                    <td className="mono gl-text-xs gl-text-muted">{c.chromosome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.fusions.length > 0 && (
        <GlCard header="Gene fusions">
          <div className="gl-col" style={{ gap: 10 }}>
            {report.fusions.map((f) => (
              <div key={f.name} className="gl-row gl-center gl-wrap" style={{ gap: 12 }}>
                <span className="mono gl-strong" style={{ fontSize: 15 }}>{f.name}</span>
                <GlBadge variant="neutral">{f.fusionType}</GlBadge>
                {f.known && <GlBadge variant="info">Known fusion</GlBadge>}
                <span className="gl-text-xs gl-text-muted">{f.supportingReads} supporting reads</span>
              </div>
            ))}
          </div>
        </GlCard>
      )}
    </div>
  );
}

function StatTile({ label, value, unit, sub, signal, signalText }: {
  label: string; value: string; unit?: string; sub?: string; signal?: boolean; signalText?: string;
}) {
  return (
    <GlCard>
      <div className="gl-text-xs gl-text-muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{value}</span>
        {unit && <span className="gl-text-sm gl-text-muted">{unit}</span>}
      </div>
      <div className="gl-row gl-center" style={{ gap: 8, marginTop: 12 }}>
        {signalText && <GlBadge variant={signal ? "success" : "neutral"}>{signalText}</GlBadge>}
        {sub && <span className="gl-text-xs gl-text-muted">{sub}</span>}
      </div>
    </GlCard>
  );
}

function Component({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{value ?? "—"}</div>
      <div className="gl-text-xs gl-text-muted">{label}</div>
    </div>
  );
}

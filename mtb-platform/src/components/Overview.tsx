import type { Report } from "../types";
import { ESCAT_META, isActionable, biomarkerPositive } from "../lib/format";
import { GlCard, GlBadge, GlLinkButton, PulseIcon, BeakerIcon, ScaleIcon } from "./gl";
import AiSummary from "./AiSummary";

export default function Overview({ report, onGoto }: { report: Report; onGoto: (t: string) => void }) {
  const { clinical, biomarkers, variants } = report;
  const actionable = variants.filter(isActionable);
  const drugs = [...new Set(actionable.flatMap((v) => v.treatments.map((t) => t.drugs)))].slice(0, 8);

  const positives = [
    biomarkerPositive("tmb", biomarkers) && `TMB-High (${biomarkers.tmb})`,
    biomarkerPositive("msi", biomarkers) && "MSI-High",
    biomarkerPositive("hrd", biomarkers) && `HRD-positive (${biomarkers.hrd})`,
  ].filter(Boolean) as string[];

  return (
    <div className="gl-col">
      <AiSummary report={report} />

      {/* Key findings — the 10-second read */}
      <GlCard header={<><PulseIcon /> Key actionable findings</>}>
        {actionable.length === 0 ? (
          <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
            No Tier I–II alterations. See Variants for investigational and other-tumour-type evidence.
          </p>
        ) : (
          <div className="gl-col" style={{ gap: 10 }}>
            {actionable.map((v) => (
              <div key={`${v.gene}-${v.alteration}`} className="gl-row gl-center gl-wrap" style={{ gap: 8 }}>
                <GlBadge variant={ESCAT_META[v.escat].variant} title={ESCAT_META[v.escat].label}>
                  {ESCAT_META[v.escat].short}
                </GlBadge>
                <span className="mono gl-strong">{v.gene}</span>
                <span className="mono gl-text-muted">{v.alteration}</span>
                {v.treatments[0] && (
                  <span className="gl-text-sm gl-text-muted">
                    → {v.treatments.map((t) => t.drugs).slice(0, 3).join(", ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <GlCard header={<><BeakerIcon /> Matched therapies</>}>
          {drugs.length === 0 ? (
            <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>None matched at Tier I–II.</p>
          ) : (
            <div className="gl-row gl-wrap" style={{ gap: 6 }}>
              {drugs.map((d) => <GlBadge key={d} variant="neutral">{d}</GlBadge>)}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <GlLinkButton onClick={() => onGoto("therapies")}>View all matched therapies →</GlLinkButton>
          </div>
        </GlCard>

        <GlCard header={<><ScaleIcon /> Biomarker signal</>}>
          {positives.length === 0 ? (
            <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
              TMB {biomarkers.tmb} · {biomarkers.msi} · {biomarkers.hrdStatus} — no positive biomarker.
            </p>
          ) : (
            <div className="gl-row gl-wrap" style={{ gap: 6 }}>
              {positives.map((p) => <GlBadge key={p} variant="success">{p}</GlBadge>)}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <GlLinkButton onClick={() => onGoto("biomarkers")}>View biomarker detail →</GlLinkButton>
          </div>
        </GlCard>
      </div>

      {/* Clinical context (mocked) */}
      <GlCard header="Clinical context">
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 24, rowGap: 8 }}>
          <Meta label="Reason for review" value={clinical.consultReason} />
          <Meta label="Prior therapy" value={clinical.priorTherapy.join(" · ")} />
          <Meta label="ECOG" value={String(clinical.ecog)} />
          <Meta label="Sample" value={`${report.patient.sampleId} · ${report.patient.panel}`} />
        </div>
        <p className="gl-text-xs gl-text-muted" style={{ marginTop: 16, marginBottom: 0 }}>{clinical.note}</p>
      </GlCard>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="gl-text-sm gl-text-muted" style={{ whiteSpace: "nowrap", paddingRight: 16 }}>{label}</span>
      <span className="gl-text-sm">{value}</span>
    </>
  );
}

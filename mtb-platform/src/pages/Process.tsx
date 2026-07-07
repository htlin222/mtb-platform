import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { Report } from "../types";
import { loadReport } from "../lib/data";
import { STAGES } from "../lib/pipeline";
import { GlBadge, CheckIcon, ServerIcon } from "../components/gl";

const STEP_MS = 850;

export default function Process() {
  const { chartNo } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vcf = params.get("vcf");
  const [report, setReport] = useState<Report | null>(null);
  const [active, setActive] = useState(-1); // index currently running; STAGES.length = all done
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartNo) return;
    loadReport(chartNo).then((r) => { setReport(r); setActive(0); }).catch((e) => setError(e.message));
  }, [chartNo]);

  useEffect(() => {
    if (active < 0 || !report) return;
    if (active >= STAGES.length) {
      const t = setTimeout(() => navigate(`/report/${chartNo}?new=1`), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [active, report, chartNo, navigate]);

  if (error) return <div className="gl-page"><div className="gl-card"><div className="gl-card-body" style={{ color: "var(--red-700)" }}>{error}</div></div></div>;
  if (!report) return <div className="gl-page"><div className="gl-spinner" /></div>;

  const done = Math.min(active, STAGES.length);
  const pct = Math.round((done / STAGES.length) * 100);
  const finished = active >= STAGES.length;

  return (
    <div className="gl-page" style={{ maxWidth: 760 }}>
      <div className="gl-page-title"><ServerIcon size={20} /><h1>Running tertiary analysis</h1></div>
      <p className="gl-page-desc">
        <span className="mono">{vcf || report.patient.sampleId}</span> · {report.patient.cancerType} ·
        TSO500 pipeline
      </p>

      <div style={{ margin: "20px 0 8px" }} className="gl-progress">
        <div className="gl-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 20 }}>
        {finished ? "Complete — opening report…" : `${done} of ${STAGES.length} stages · ${pct}%`}
      </div>

      <div className="gl-card"><div className="gl-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {STAGES.map((s, i) => {
          const state = i < active ? "done" : i === active ? "running" : "pending";
          return (
            <div key={s.id} className={`gl-stage ${state}`}>
              <span className="gl-stage-icon">
                {state === "done" ? <CheckIcon size={16} /> : state === "running" ? <span className="gl-mini-spinner" /> : <span className="mono gl-text-xs">{i}</span>}
              </span>
              <div className="gl-stage-body">
                <div className="gl-stage-title">
                  <span className="mono gl-text-xs gl-text-muted">{s.id}</span>
                  {s.name}
                  <span className="gl-stage-tool">· {s.tool}</span>
                </div>
                {state !== "pending" && <div className="gl-stage-detail gl-fade-in">{s.detail(report)}</div>}
              </div>
            </div>
          );
        })}
      </div></div>

      {finished && (
        <div className="gl-fade-in" style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <GlBadge variant="success">Analysis complete</GlBadge>
          <button className="gl-button gl-button-confirm" onClick={() => navigate(`/report/${chartNo}?new=1`)}>
            Open report →
          </button>
        </div>
      )}
    </div>
  );
}

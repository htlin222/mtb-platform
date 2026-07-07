import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlCard, GlBadge, ScaleIcon } from "../components/gl";

interface CohortData {
  title: string; subtitle: string; n: number; cancerTypes: number; months: number; panel: string;
  biomarkers: { label: string; n: number; pct: number; signal: boolean }[];
  therapyMatch: { label: string; n: number; pct: number; tone: string }[];
  topGenes: { gene: string; n: number }[];
  distribution: { type: string; n: number }[];
  marquee: string; conclusion: string;
}

export default function Cohort() {
  const navigate = useNavigate();
  const [d, setD] = useState<CohortData | null>(null);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/cohort.json`).then((r) => r.json()).then(setD).catch(() => setD(null)); }, []);
  if (!d) return <div className="gl-page"><div className="gl-spinner" /></div>;

  const maxGene = Math.max(...d.topGenes.map((g) => g.n));
  const maxDist = Math.max(...d.distribution.map((x) => x.n));

  return (
    <div className="gl-page" style={{ maxWidth: 1080 }}>
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>Cohort
      </div>
      <div className="gl-page-title"><ScaleIcon size={20} /><h1>{d.title}</h1></div>
      <p className="gl-page-desc">{d.subtitle}</p>
      <div className="gl-row gl-wrap" style={{ gap: 8, marginTop: 8 }}>
        <GlBadge variant="info">n = {d.n}</GlBadge>
        <GlBadge variant="neutral">{d.cancerTypes} cancer types</GlBadge>
        <GlBadge variant="neutral">{d.months} monthly batches</GlBadge>
        <GlBadge variant="neutral">{d.panel}</GlBadge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 20 }}>
        {/* biomarkers */}
        <GlCard header="Biomarker landscape">
          {d.biomarkers.map((b) => (
            <Row key={b.label} label={b.label} n={b.n} pct={b.pct} total={d.n}
              color={b.signal ? "var(--green-500)" : "var(--blue-100)"} />
          ))}
        </GlCard>

        {/* therapy match */}
        <GlCard header="Therapy-match rate">
          {d.therapyMatch.map((t) => (
            <Row key={t.label} label={t.label} n={t.n} pct={t.pct} total={d.n}
              color={t.tone === "success" ? "var(--green-500)" : t.tone === "danger" ? "var(--red-500)" : "var(--blue-400)"} />
          ))}
        </GlCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16 }}>
        {/* top genes */}
        <GlCard header="Recurrent oncogenic drivers">
          {d.topGenes.map((g) => (
            <div key={g.gene} className="gl-row gl-center" style={{ gap: 10, marginBottom: 8 }}>
              <span className="mono gl-strong" style={{ width: 64 }}>{g.gene}</span>
              <span className="gl-funnel-track" style={{ height: 20 }}>
                <span className="gl-funnel-bar" style={{ width: `${(g.n / maxGene) * 100}%` }}>{g.n}</span>
              </span>
            </div>
          ))}
        </GlCard>

        {/* distribution */}
        <GlCard header="Cancer types">
          {d.distribution.map((x) => (
            <div key={x.type} className="gl-row gl-center" style={{ gap: 10, marginBottom: 8 }}>
              <span className="gl-text-sm" style={{ width: 100 }}>{x.type}</span>
              <span className="gl-funnel-track" style={{ height: 20 }}>
                <span className="gl-funnel-bar" style={{ width: `${(x.n / maxDist) * 100}%`, background: "var(--purple-100)", borderRightColor: "var(--purple-500)", color: "var(--purple-700)" }}>{x.n}</span>
              </span>
            </div>
          ))}
        </GlCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <GlCard header="Marquee finding">
          <p className="gl-text-sm gl-text-secondary" style={{ margin: 0, lineHeight: 1.6 }}>{d.marquee}</p>
        </GlCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <GlCard>
          <p className="gl-text-sm" style={{ margin: 0, lineHeight: 1.6 }}>{d.conclusion}</p>
          <div style={{ marginTop: 12 }}>
            <button className="gl-button gl-button-confirm" onClick={() => navigate("/")}>Browse patient reports →</button>
          </div>
        </GlCard>
      </div>
    </div>
  );
}

function Row({ label, n, pct, total, color }: { label: string; n: number; pct: number; total: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="gl-row gl-center gl-between" style={{ marginBottom: 4 }}>
        <span className="gl-text-sm">{label}</span>
        <span className="gl-text-sm gl-text-muted"><span className="gl-strong" style={{ color: "var(--text)" }}>{n}</span>/{total} · {pct}%</span>
      </div>
      <div className="gl-funnel-track" style={{ height: 8 }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: "var(--radius-pill)" }} />
      </div>
    </div>
  );
}

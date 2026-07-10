import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { Report } from "../types";
import { loadReport } from "../lib/data";
import { STATUS_META, isActionable, ESCAT_META } from "../lib/format";
import {
  GlBadge, GlCount, GlLinkButton,
  PersonIcon, PulseIcon, ScaleIcon, BeakerIcon, BookIcon, ListIcon, CommentIcon, CheckIcon, SyncIcon,
} from "../components/gl";
import Overview from "../components/Overview";
import ClinicalTab from "../components/ClinicalTab";
import VariantsTab from "../components/VariantsTab";
import BiomarkersTab from "../components/BiomarkersTab";
import TherapiesTab from "../components/TherapiesTab";
import LiteratureTab from "../components/LiteratureTab";

type TabKey = "overview" | "clinical" | "variants" | "biomarkers" | "therapies" | "literature";

const TABS: { key: TabKey; label: string; icon: React.FC<{ size?: number }> }[] = [
  { key: "overview", label: "Overview", icon: ListIcon },
  { key: "clinical", label: "Clinical", icon: CommentIcon },
  { key: "variants", label: "Variants", icon: PulseIcon },
  { key: "biomarkers", label: "Biomarkers", icon: ScaleIcon },
  { key: "therapies", label: "Therapies", icon: BeakerIcon },
  { key: "literature", label: "Literature", icon: BookIcon },
];

export default function ReportPage() {
  const { chartNo } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isNew = params.get("new") === "1";
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!chartNo) return;
    setReport(null); setSigned(false);
    loadReport(chartNo).then((r) => {
      setReport(r);
      setSelected(new Set(r.variants.filter(isActionable).map((v) => `${v.gene} ${v.alteration}`)));
    }).catch((e) => setError(e.message));
  }, [chartNo]);

  if (error) {
    return (
      <div className="gl-page">
        <div className="gl-card" style={{ borderColor: "var(--red-100)" }}>
          <div className="gl-card-body" style={{ color: "var(--red-700)" }}>{error}</div>
        </div>
        <GlLinkButton onClick={() => navigate("/")}>← Back to worklist</GlLinkButton>
      </div>
    );
  }
  if (!report) return <div className="gl-page"><div className="gl-spinner" /></div>;

  const { patient, biomarkers } = report;
  const status = STATUS_META[patient.status];
  const counts: Record<TabKey, number | null> = {
    overview: null,
    clinical: report.clinical.journal.length,
    variants: report.variants.length,
    biomarkers: report.cnv.length + report.fusions.length,
    therapies: report.variants.reduce((n, v) => n + v.treatments.length, 0),
    literature: report.literature.length,
  };
  const actionable = report.variants.filter(isActionable);

  return (
    <div className="gl-page">
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>
        {patient.name}
      </div>

      {/* patient header */}
      <div className="gl-row gl-center gl-wrap" style={{ gap: 10 }}>
        <PersonIcon size={20} />
        <h1 style={{ fontSize: 20 }}>{patient.name}</h1>
        <GlBadge variant={signed ? "success" : status.variant}>{signed ? "Signed off" : status.label}</GlBadge>
        <button className="gl-button" style={{ marginLeft: "auto" }} onClick={() => navigate(`/deck/${patient.chartNo}`)}>
          ▷ Present case
        </button>
      </div>
      <div className="gl-meta">
        {patient.chartNo === "live" ? (
          <>
            <span className="mono gl-text-xs">{patient.sampleId}</span>
            <span className="dot">·</span>
            <span style={{ color: "var(--text)" }}>{patient.cancerType}</span>
            <span className="dot">·</span>
            <span>{patient.panel}</span>
          </>
        ) : (
          <>
            <span className="mono gl-text-xs">{patient.chartNo}</span>
            <span className="dot">·</span>
            <span>{patient.sex === "F" ? "Female" : "Male"}, {patient.age}</span>
            <span className="dot">·</span>
            <span style={{ color: "var(--text)" }}>{patient.cancerType}</span>
            <GlBadge variant="neutral">{patient.stage}</GlBadge>
            <span className="dot">·</span>
            <span>{patient.team} · {patient.attending}</span>
          </>
        )}
      </div>

      {/* live upload: make the boundary explicit — what the VCF establishes on
          its own vs. what genuinely needs the full pipeline. Nothing is faked. */}
      {patient.chartNo === "live" && <LiveProvenance report={report} />}

      {/* re-annotation alert: variants reclassified since the report was issued */}
      {report.reannotation.events.length > 0 && (
        <div className="gl-card" style={{ marginTop: 16, borderColor: "var(--orange-100)", background: "var(--orange-50)" }}>
          <div className="gl-card-body">
            <div className="gl-row gl-center" style={{ gap: 8, marginBottom: 8 }}>
              <span style={{ color: "var(--orange-700)", display: "inline-flex" }}><SyncIcon size={16} /></span>
              <span className="gl-strong">
                {report.reannotation.events.length} variant{report.reannotation.events.length > 1 ? "s" : ""} reclassified since this report was issued
              </span>
              <span className="gl-text-xs gl-text-muted">· re-annotated {report.reannotation.lastRun} · {report.reannotation.knowledgeBase}</span>
            </div>
            <div className="gl-col" style={{ gap: 8 }}>
              {report.reannotation.events.map((e, i) => (
                <div key={i} className="gl-row gl-center gl-wrap" style={{ gap: 8 }}>
                  {e.nowActionable && <GlBadge variant="warning">Now actionable</GlBadge>}
                  <span className="mono gl-strong">{e.gene}</span>
                  <span className="mono gl-text-sm">{e.alteration}</span>
                  <span className="gl-text-sm gl-text-muted">{e.fromCall}</span>
                  <span className="gl-text-muted">→</span>
                  <span className="gl-text-sm">{e.toCall}</span>
                  <GlBadge variant={ESCAT_META[e.fromTier].variant}>{ESCAT_META[e.fromTier].short}</GlBadge>
                  <span className="gl-text-muted">→</span>
                  <GlBadge variant={ESCAT_META[e.toTier].variant}>{ESCAT_META[e.toTier].short}</GlBadge>
                </div>
              ))}
            </div>
            <p className="gl-text-sm gl-text-secondary" style={{ margin: "10px 0 0" }}>{report.reannotation.events[0].note}</p>
          </div>
        </div>
      )}

      {/* decision bar: select findings for the board & sign off */}
      {actionable.length > 0 && (
        <div className="gl-card" style={{ marginTop: 16, borderColor: signed ? "var(--green-100)" : (isNew ? "var(--blue-100)" : "var(--border)") }}>
          <div className="gl-card-body">
            {signed ? (
              <div className="gl-row gl-center" style={{ gap: 10 }}>
                <span className="gl-timeline-badge success" style={{ width: 28, height: 28 }}><CheckIcon size={15} /></span>
                <div>
                  <div className="gl-strong">Report signed off</div>
                  <div className="gl-text-xs gl-text-muted">
                    {selected.size} finding(s) taken to the board — {[...selected].join(", ")}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 8 }}>
                  Select actionable findings to take to the board, then sign off.
                </div>
                <div className="gl-row gl-center gl-between gl-wrap" style={{ gap: 12 }}>
                  <div className="gl-row gl-wrap" style={{ gap: 8 }}>
                    {actionable.map((v) => {
                      const key = `${v.gene} ${v.alteration}`;
                      const on = selected.has(key);
                      return (
                        <button key={key}
                          onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                          className="gl-badge"
                          style={{
                            cursor: "pointer", fontSize: 13, padding: "4px 10px",
                            border: `1px solid ${on ? "var(--blue-500)" : "var(--border-strong)"}`,
                            background: on ? "var(--blue-50)" : "var(--bg-surface)",
                            color: on ? "var(--blue-900)" : "var(--text-muted)",
                          }}>
                          {on ? <CheckIcon size={13} /> : null}
                          <span className="mono gl-strong">{v.gene}</span>
                          <span className="mono">{v.alteration}</span>
                          <GlBadge variant={ESCAT_META[v.escat].variant}>{ESCAT_META[v.escat].short}</GlBadge>
                        </button>
                      );
                    })}
                  </div>
                  <div className="gl-row" style={{ gap: 8 }}>
                    <button className="gl-button" onClick={() => navigate(`/board/${patient.chartNo}`)}>
                      <CommentIcon size={14} /> Convene board
                    </button>
                    <button className="gl-button gl-button-confirm" disabled={selected.size === 0}
                      style={selected.size === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                      onClick={() => setSigned(true)}>
                      <CheckIcon size={14} /> Sign off report
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* body: content + rail */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 24, marginTop: 20, alignItems: "start" }}>
        <div>
          <div className="gl-tabs">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} className={`gl-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
                  <Icon size={16} />
                  {t.label}
                  {counts[t.key] != null && <GlCount value={counts[t.key]!} />}
                </button>
              );
            })}
          </div>

          {tab === "overview" && <Overview report={report} onGoto={(t) => setTab(t as TabKey)} />}
          {tab === "clinical" && <ClinicalTab report={report} />}
          {tab === "variants" && <VariantsTab report={report} />}
          {tab === "biomarkers" && <BiomarkersTab report={report} />}
          {tab === "therapies" && <TherapiesTab report={report} />}
          {tab === "literature" && <LiteratureTab report={report} />}
        </div>

        {/* At-a-glance rail */}
        <aside className="gl-card" style={{ position: "sticky", top: 20 }}>
          <div className="gl-card-body">
            <div className="gl-section-title">At a glance</div>
            <Glance label="Actionable (Tier I–II)"><GlCount value={actionable.length} active={actionable.length > 0} /></Glance>
            <Glance label="Annotated alterations"><span className="gl-strong">{report.variants.length}</span></Glance>
            <Glance label="Matched therapies"><span className="gl-strong">{counts.therapies}</span></Glance>
            <hr className="gl-divider" />
            <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 8 }}>Biomarkers</div>
            <div className="gl-row gl-wrap" style={{ gap: 6 }}>
              <GlBadge variant={biomarkers.tmbClass === "TMB-High" ? "success" : "neutral"}>TMB {biomarkers.tmb}</GlBadge>
              <GlBadge variant={biomarkers.msi === "MSI-H" ? "success" : "neutral"}>{biomarkers.msi}</GlBadge>
              <GlBadge variant={biomarkers.hrdStatus.toLowerCase().includes("positive") ? "success" : "neutral"}>{biomarkers.hrdStatus}</GlBadge>
            </div>
            <hr className="gl-divider" />
            <div className="gl-row gl-center" style={{ gap: 6, marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)", display: "inline-flex" }}><SyncIcon size={13} /></span>
              <span className="gl-text-xs gl-text-muted">Re-annotation</span>
            </div>
            <div className="gl-text-xs">{report.reannotation.cadence}</div>
            {report.reannotation.lastRun && (
              <div className="gl-text-xs gl-text-muted" style={{ marginTop: 2 }}>
                last {report.reannotation.lastRun} · next {report.reannotation.nextRun}
              </div>
            )}
            <hr className="gl-divider" />
            <div className="gl-text-xs gl-text-muted">Sample</div>
            <div className="mono gl-text-xs">{patient.sampleId}</div>
            <div className="gl-text-xs gl-text-muted" style={{ marginTop: 4 }}>{patient.panel}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Boundary panel for live-uploaded VCFs: the left column is everything derivable
// from the variant calls alone (deterministic, no model); the right is what the
// platform explicitly does NOT claim without the full pipeline. Surfacing the
// limit is the point — it's the responsible-deployment flex, not a hedge.
function LiveProvenance({ report }: { report: Report }) {
  const actionable = report.variants.filter((v) => v.escat === "I" || v.escat === "II").length;
  const established = [
    `${report.biomarkers.variantCount} somatic PASS variants parsed in-browser`,
    `${report.variants.length} fell in actionable genes · ${actionable} at Tier I–II`,
    `TMB proxy ${report.biomarkers.tmb} mut/Mb (coding footprint)`,
    `Allele fractions per variant`,
  ];
  const needsPipeline = [
    "OncoKB / ESCAT evidence levels (region match only here)",
    "MSI & HRD — require the aligned BAM, not the VCF",
    "Copy-number & fusions",
    "Curated systematic-review appraisal (run the agent per gene)",
  ];
  return (
    <div className="gl-card" style={{ marginTop: 16 }}>
      <div className="gl-card-body">
        <div className="gl-row gl-center" style={{ gap: 8, marginBottom: 4 }}>
          <span className="gl-strong">Provenance — this is a live VCF screen</span>
          <GlBadge variant="info">no server upload</GlBadge>
        </div>
        <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 12px" }}>
          Everything below is computed from the variant calls in your browser. Nothing
          that needs the full pipeline is inferred or faked.
        </p>
        <div className="gl-provenance-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="gl-text-xs gl-strong" style={{ color: "var(--green-600, #217645)", marginBottom: 6 }}>
              ✓ Established from the VCF
            </div>
            <ul className="gl-text-sm" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              {established.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div>
            <div className="gl-text-xs gl-strong" style={{ color: "var(--orange-700, #a35200)", marginBottom: 6 }}>
              ⋯ Needs the full pipeline to confirm
            </div>
            <ul className="gl-text-sm gl-text-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              {needsPipeline.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Glance({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gl-row gl-center gl-between" style={{ marginBottom: 12 }}>
      <span className="gl-text-sm gl-text-muted">{label}</span>
      {children}
    </div>
  );
}

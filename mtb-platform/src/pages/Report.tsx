import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Report } from "../types";
import { loadReport } from "../lib/data";
import { STATUS_META, isActionable } from "../lib/format";
import {
  GlBadge, GlCount, GlLinkButton,
  PersonIcon, PulseIcon, ScaleIcon, BeakerIcon, BookIcon, ListIcon,
} from "../components/gl";
import Overview from "../components/Overview";
import VariantsTab from "../components/VariantsTab";
import BiomarkersTab from "../components/BiomarkersTab";
import TherapiesTab from "../components/TherapiesTab";
import LiteratureTab from "../components/LiteratureTab";

type TabKey = "overview" | "variants" | "biomarkers" | "therapies" | "literature";

const TABS: { key: TabKey; label: string; icon: React.FC<{ size?: number }> }[] = [
  { key: "overview", label: "Overview", icon: ListIcon },
  { key: "variants", label: "Variants", icon: PulseIcon },
  { key: "biomarkers", label: "Biomarkers", icon: ScaleIcon },
  { key: "therapies", label: "Therapies", icon: BeakerIcon },
  { key: "literature", label: "Literature", icon: BookIcon },
];

export default function ReportPage() {
  const { chartNo } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (!chartNo) return;
    setReport(null);
    loadReport(chartNo).then(setReport).catch((e) => setError(e.message));
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
        <GlBadge variant={status.variant}>{status.label}</GlBadge>
      </div>
      <div className="gl-meta">
        <span className="mono gl-text-xs">{patient.chartNo}</span>
        <span className="dot">·</span>
        <span>{patient.sex === "F" ? "Female" : "Male"}, {patient.age}</span>
        <span className="dot">·</span>
        <span style={{ color: "var(--text)" }}>{patient.cancerType}</span>
        <GlBadge variant="neutral">{patient.stage}</GlBadge>
        <span className="dot">·</span>
        <span>{patient.team} · {patient.attending}</span>
      </div>

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
            <div className="gl-text-xs gl-text-muted">Sample</div>
            <div className="mono gl-text-xs">{patient.sampleId}</div>
            <div className="gl-text-xs gl-text-muted" style={{ marginTop: 4 }}>{patient.panel}</div>
          </div>
        </aside>
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

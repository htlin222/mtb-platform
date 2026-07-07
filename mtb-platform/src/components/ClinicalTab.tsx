import type { Report, JournalEvent } from "../types";
import {
  GlCard, GlBadge,
  CheckIcon, DocIcon, CommentIcon, TagIcon, UploadIcon, ServerIcon,
  BeakerIcon, PulseIcon, ScaleIcon, BookIcon,
} from "./gl";

const KIND_ICON: Record<JournalEvent["kind"], React.FC<{ size?: number }>> = {
  chemo: BeakerIcon,
  specimen: UploadIcon,
  sequencing: ServerIcon,
  qc: CheckIcon,
  variants: PulseIcon,
  biomarker: ScaleIcon,
  annotation: TagIcon,
  literature: BookIcon,
  draft: DocIcon,
  consult: CommentIcon,
  review: CommentIcon,
  signoff: CheckIcon,
  lab: ScaleIcon,
};

const ACCENT_KINDS = new Set(["consult", "review", "annotation", "biomarker", "variants"]);

export default function ClinicalTab({ report }: { report: Report }) {
  const c = report.clinical;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      {/* Left: the journal */}
      <GlCard header={<><PulseIcon /> Course journal</>}>
        <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 16px" }}>
          Chronological log for sample <span className="mono">{report.patient.sampleId}</span> — molecular
          pipeline milestones woven with clinical events.
        </p>
        <ul className="gl-timeline">
          {c.journal.map((e, i) => {
            const Icon = KIND_ICON[e.kind] || DocIcon;
            const tone = e.kind === "signoff" ? "success" : ACCENT_KINDS.has(e.kind) ? "accent" : "";
            return (
              <li className="gl-timeline-item" key={i}>
                <span className={`gl-timeline-badge ${tone}`}><Icon size={15} /></span>
                <div className="gl-timeline-body">
                  <div className="gl-timeline-title">{e.title}</div>
                  <div className="gl-timeline-meta">{e.date} · {e.actor}</div>
                  {e.detail && <div className="gl-timeline-detail">{e.detail}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </GlCard>

      {/* Right: consult note + chemo + labs */}
      <div className="gl-col">
        <GlCard header="MTB consult note">
          <div className="gl-row gl-center" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <GlBadge variant="info">{c.consultNote.fromTeam}</GlBadge>
            <span className="gl-text-muted">→</span>
            <GlBadge variant="neutral">{c.consultNote.toTeam}</GlBadge>
            <span className="gl-grow" />
            <span className="gl-text-xs gl-text-muted">{c.consultNote.date}</span>
          </div>
          <Field label="History" value={c.consultNote.history} />
          <Field label="Purpose" value={c.consultNote.purpose} />
          <Field label="Opinion" value={c.consultNote.opinion} />
        </GlCard>

        <GlCard header="Chemotherapy">
          {c.chemo.map((ch, i) => (
            <div key={i} className="gl-row gl-center gl-between" style={{ padding: "8px 0", borderBottom: i < c.chemo.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div>
                <div className="gl-strong gl-text-sm">{ch.regimen}</div>
                <div className="gl-text-xs gl-text-muted">Cycle {ch.cycleNo} · {ch.beginDate}</div>
              </div>
              <GlBadge variant={ch.status === "Completed" ? "success" : ch.status === "Planned" ? "neutral" : "info"}>{ch.status}</GlBadge>
            </div>
          ))}
        </GlCard>

        <div>
          <div className="gl-section-title">Pre-treatment labs</div>
          <div className="gl-table-card">
            <table className="gl-table">
              <thead><tr><th>Test</th><th>Value</th><th>Flag</th></tr></thead>
              <tbody>
                {c.labs.map((l) => (
                  <tr key={l.key}>
                    <td className="gl-text-sm">{l.label}</td>
                    <td className="mono">{l.value}<span className="gl-text-xs gl-text-muted"> {l.unit}</span></td>
                    <td>
                      <GlBadge variant={l.abnormal === "high" ? "danger" : l.abnormal === "low" ? "warning" : "neutral"}>
                        {l.abnormal === "high" ? "High" : l.abnormal === "low" ? "Low" : "Normal"}
                      </GlBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="gl-text-xs gl-text-muted">{label}</div>
      <div className="gl-text-sm">{value}</div>
    </div>
  );
}

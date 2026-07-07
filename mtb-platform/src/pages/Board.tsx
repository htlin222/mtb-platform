import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Report } from "../types";
import { loadReport } from "../lib/data";
import {
  EXPERTS, CATEGORY_LABEL, DEFAULT_PANEL, topFinding, VOTE_META,
  type Category, type Vote,
} from "../lib/board";
import { GlBadge, GlCard, PersonIcon, CheckIcon, CommentIcon } from "../components/gl";

export default function Board() {
  const { chartNo } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_PANEL));
  const [convened, setConvened] = useState(false);
  const [activeId, setActiveId] = useState<string>(DEFAULT_PANEL[0]);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (!chartNo) return;
    loadReport(chartNo).then(setReport).catch((e) => setError(e.message));
  }, [chartNo]);

  const top = useMemo(() => (report ? topFinding(report) : undefined), [report]);

  if (error) return <div className="gl-page"><GlCard><span style={{ color: "var(--red-700)" }}>{error}</span></GlCard></div>;
  if (!report) return <div className="gl-page"><div className="gl-spinner" /></div>;

  const panel = EXPERTS.filter((e) => selected.has(e.id));

  function convene() {
    const v: Record<string, Vote> = {};
    for (const e of panel) v[e.id] = e.vote(report!, top);
    setVotes(v);
    setActiveId(panel[0]?.id ?? "");
    setConvened(true);
  }

  const tally = panel.reduce(
    (acc, e) => { const v = votes[e.id] ?? 0; acc[v === 1 ? "up" : v === -1 ? "down" : "abs"]++; return acc; },
    { up: 0, down: 0, abs: 0 },
  );
  const endorsed = tally.up > tally.down && tally.up >= Math.ceil(panel.length / 2);

  return (
    <div className="gl-page">
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>
        <a role="button" onClick={() => navigate(`/report/${chartNo}`)} style={{ cursor: "pointer" }}>{report.patient.name}</a>
        <span className="sep">/</span>Tumor board
      </div>
      <div className="gl-row gl-center gl-between gl-wrap">
        <div className="gl-page-title"><CommentIcon size={20} /><h1>Molecular Tumor Board</h1></div>
        {convened && (
          <div className="gl-row gl-center" style={{ gap: 8 }}>
            <span className="gl-text-xs gl-text-muted">In the room</span>
            <span className="gl-avatar-stack">
              {panel.map((e) => <span key={e.id} className="gl-avatar" style={{ width: 28, height: 28 }} title={e.name}>{e.initials}</span>)}
              <span className="gl-avatar" style={{ width: 28, height: 28, background: "var(--gray-500)" }} title="You (chair)">You</span>
            </span>
          </div>
        )}
      </div>
      <p className="gl-page-desc">
        {report.patient.name} · {report.patient.cancerType} · discussing{" "}
        {top ? <><span className="mono gl-strong">{top.gene}</span> <span className="mono">{top.alteration}</span> <GlBadge variant="info">ESCAT {top.escat}</GlBadge></> : "no actionable driver"}
      </p>

      {!convened ? (
        <PanelPicker selected={selected} setSelected={setSelected} onConvene={convene} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 16, marginTop: 20, alignItems: "start" }}>
          {/* deliberation: tabbed expert opinions */}
          <div>
            <div className="gl-tabs" style={{ flexWrap: "wrap" }}>
              {panel.map((e) => (
                <button key={e.id} className={`gl-tab${activeId === e.id ? " active" : ""}`} onClick={() => setActiveId(e.id)}>
                  <span className={`gl-avatar vote-${votes[e.id] ?? 0}`} style={{ width: 20, height: 20, fontSize: 10, border: "none" }}>{e.initials}</span>
                  {e.role}
                </button>
              ))}
            </div>
            {panel.filter((e) => e.id === activeId).map((e) => (
              <GlCard key={e.id}>
                <div className="gl-row gl-center" style={{ gap: 10, marginBottom: 12 }}>
                  <span className="gl-avatar" style={{ width: 36, height: 36 }}>{e.initials}</span>
                  <div>
                    <div className="gl-strong">{e.name}</div>
                    <div className="gl-text-xs gl-text-muted">{e.role} · {CATEGORY_LABEL[e.category]}</div>
                  </div>
                  <span className="gl-grow" />
                  <GlBadge variant={VOTE_META[String(votes[e.id] ?? 0) as "0"].variant}>{VOTE_META[String(votes[e.id] ?? 0) as "0"].label}</GlBadge>
                </div>
                <p className="gl-text-sm" style={{ lineHeight: 1.6, margin: "0 0 16px" }}>{e.opinion(report, top)}</p>
                <div className="gl-row gl-center" style={{ gap: 10 }}>
                  <span className="gl-text-xs gl-text-muted">Stance</span>
                  <div className="gl-vote-btns">
                    <button className={`gl-vote-btn${votes[e.id] === 1 ? " on-endorse" : ""}`} onClick={() => setVotes((s) => ({ ...s, [e.id]: 1 }))}>▲ Endorse</button>
                    <button className={`gl-vote-btn${votes[e.id] === 0 ? " on-abstain" : ""}`} onClick={() => setVotes((s) => ({ ...s, [e.id]: 0 }))}>Abstain</button>
                    <button className={`gl-vote-btn${votes[e.id] === -1 ? " on-dissent" : ""}`} onClick={() => setVotes((s) => ({ ...s, [e.id]: -1 }))}>▼ Dissent</button>
                  </div>
                </div>
              </GlCard>
            ))}
          </div>

          {/* board conclusion */}
          <aside className="gl-card" style={{ position: "sticky", top: 20 }}>
            <div className="gl-card-header">Board decision</div>
            <div className="gl-card-body">
              <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>Panel tally</div>
              <div className="gl-row gl-center" style={{ gap: 14, marginBottom: 12 }}>
                <Tally n={tally.up} label="Endorse" color="var(--green-600)" />
                <Tally n={tally.abs} label="Abstain" color="var(--gray-500)" />
                <Tally n={tally.down} label="Dissent" color="var(--red-600)" />
              </div>
              <div className="gl-avatar-stack" style={{ marginBottom: 14 }}>
                {panel.map((e) => (
                  <span key={e.id} className={`gl-avatar vote-${votes[e.id] ?? 0}`} style={{ width: 26, height: 26, fontSize: 11 }} title={`${e.role}: ${VOTE_META[String(votes[e.id] ?? 0) as "0"].label}`}>{e.initials}</span>
                ))}
              </div>
              <hr className="gl-divider" />
              {decided ? (
                <div className="gl-row" style={{ gap: 10 }}>
                  <span className="gl-avatar vote-1" style={{ width: 28, height: 28, border: "none" }}><CheckIcon size={15} /></span>
                  <div>
                    <div className="gl-strong">Decision captured</div>
                    <div className="gl-text-xs gl-text-muted">
                      {endorsed && top ? `Proceed with ${top.treatments.map((t) => t.drugs)[0] ?? "matched therapy"} · ${tally.up}/${panel.length} endorsed` : `Deferred · ${tally.up}/${panel.length} endorsed`}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="gl-text-sm" style={{ marginBottom: 4 }}>Recommendation</div>
                  <p className="gl-text-sm gl-text-secondary" style={{ margin: "0 0 14px" }}>
                    {endorsed && top
                      ? <>Proceed with <span className="gl-strong">{top.treatments.map((t) => t.drugs)[0] ?? "the matched therapy"}</span> targeting <span className="mono">{top.gene}</span>.</>
                      : "Panel is not in majority endorsement — defer and gather more input."}
                  </p>
                  <button className="gl-button gl-button-confirm" onClick={() => setDecided(true)} style={{ width: "100%", justifyContent: "center" }}>
                    <CheckIcon size={14} /> Capture board decision
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PanelPicker({ selected, setSelected, onConvene }: {
  selected: Set<string>; setSelected: (s: Set<string>) => void; onConvene: () => void;
}) {
  const cats = ["clinical", "molecular", "pharmacy", "trials"] as Category[];
  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  return (
    <div style={{ marginTop: 20 }}>
      <div className="gl-row gl-center gl-between" style={{ marginBottom: 12 }}>
        <div className="gl-section-title" style={{ margin: 0 }}>Select your panel</div>
        <button className="gl-button gl-button-confirm" disabled={selected.size === 0}
          style={selected.size === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          onClick={onConvene}>
          <PersonIcon size={14} /> Convene panel ({selected.size})
        </button>
      </div>
      {cats.map((cat) => {
        const experts = EXPERTS.filter((e) => e.category === cat);
        if (!experts.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{CATEGORY_LABEL[cat]}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {experts.map((e) => {
                const on = selected.has(e.id);
                return (
                  <div key={e.id} className={`gl-picker-card${on ? " on" : ""}`} onClick={() => toggle(e.id)}>
                    <div className="gl-row gl-center" style={{ gap: 10 }}>
                      <span className="gl-avatar" style={{ width: 32, height: 32 }}>{e.initials}</span>
                      <div className="gl-grow">
                        <div className="gl-strong gl-text-sm">{e.role}</div>
                        <div className="gl-text-xs gl-text-muted">{e.name}</div>
                      </div>
                      {on && <span style={{ color: "var(--blue-600)" }}><CheckIcon size={16} /></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tally({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color }}>{n}</div>
      <div className="gl-text-xs gl-text-muted">{label}</div>
    </div>
  );
}

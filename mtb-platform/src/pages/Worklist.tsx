import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorklistEntry } from "../types";
import { loadWorklist } from "../lib/data";
import { STATUS_META } from "../lib/format";
import { GlBadge, GlCount, GlLinkButton, SearchIcon, BeakerIcon } from "../components/gl";

export default function Worklist() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorklistEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [teamIdx, setTeamIdx] = useState(0);

  useEffect(() => {
    loadWorklist().then(setRows).catch((e) => setError(e.message));
  }, []);

  const teams = useMemo(
    () => ["All teams", ...(rows ? Array.from(new Set(rows.map((r) => r.team))) : [])],
    [rows],
  );

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const teamOk = teamIdx === 0 || r.team === teams[teamIdx];
      const qOk =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.chartNo.includes(q) ||
        r.cancerType.toLowerCase().includes(q) ||
        r.topFindings.toLowerCase().includes(q);
      return teamOk && qOk;
    });
  }, [rows, query, teamIdx, teams]);

  return (
    <div className="gl-page">
      <div className="gl-page-title">
        <BeakerIcon size={22} />
        <h1>Molecular Tumor Board</h1>
      </div>
      <p className="gl-page-desc">
        Shared worklist across teams — clinical context, molecular profiling, and supporting
        literature for every sequenced patient.
      </p>

      {error && (
        <div className="gl-card" style={{ marginTop: 24, borderColor: "var(--red-100)" }}>
          <div className="gl-card-body" style={{ color: "var(--red-700)" }}>{error}</div>
        </div>
      )}
      {!rows && !error && <div className="gl-spinner" />}

      {rows && (
        <>
          <div className="gl-row gl-wrap gl-center" style={{ margin: "24px 0 16px" }}>
            <span className="gl-input-wrap">
              <SearchIcon />
              <input
                className="gl-input"
                placeholder="Search patient, chart no, diagnosis, gene"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
            <div className="gl-segmented">
              {teams.map((t, i) => (
                <button key={t} className={teamIdx === i ? "active" : ""} onClick={() => setTeamIdx(i)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="gl-text-sm gl-text-muted" style={{ marginBottom: 8 }}>
            {filtered.length} of {rows.length} patients · molecular data from the TSO500 pipeline
          </div>

          <div className="gl-table-card">
            <table className="gl-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Chart</th>
                  <th>Diagnosis</th>
                  <th>Actionable</th>
                  <th>Team</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const s = STATUS_META[r.status];
                  return (
                    <tr key={r.chartNo}>
                      <td>
                        <GlLinkButton onClick={() => navigate(`/report/${r.chartNo}`)} style={{ fontWeight: 600 }}>
                          {r.name}
                        </GlLinkButton>
                      </td>
                      <td className="mono gl-text-xs gl-text-muted">{r.chartNo}</td>
                      <td>
                        {r.cancerType}
                        <span className="gl-text-muted"> · {r.stage}</span>
                      </td>
                      <td>
                        <span className="gl-row gl-center" style={{ gap: 8 }}>
                          <GlCount value={r.actionableCount} active={r.actionableCount > 0} />
                          <span className="mono gl-text-xs gl-text-muted">{r.topFindings}</span>
                        </span>
                      </td>
                      <td className="gl-text-sm">{r.team}</td>
                      <td><GlBadge variant={s.variant}>{s.label}</GlBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="gl-text-xs gl-text-muted" style={{ marginTop: 24 }}>
            Molecular results are real ngs-tertiary-analysis-skills pipeline output (OncoKB · ESCAT ·
            PubMed). Patient identity is mocked per sample and PHI-free.
          </p>
        </>
      )}
    </div>
  );
}

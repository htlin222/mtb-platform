import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { WorklistEntry } from "../types";
import { loadWorklist, LIVE_KEY } from "../lib/data";
import { parseVcf, type ParseResult } from "../lib/vcf";
import { buildLiveReport } from "../lib/liveReport";
import { GlCard, GlBadge, UploadIcon, BeakerIcon } from "../components/gl";
import { ESCAT_META } from "../lib/format";

export default function Upload() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorklistEntry[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { loadWorklist().then(setRows).catch(() => setRows([])); }, []);

  const ingest = useCallback((text: string, name: string) => {
    try {
      const pr = parseVcf(text, name);
      if (pr.total === 0) { setErr("No PASS variant records found — is this a VCF?"); return; }
      setErr(null); setParsed(pr);
    } catch { setErr("Could not parse this file as a VCF."); }
  }, []);

  const readFile = useCallback((f: File) => {
    const r = new FileReader();
    r.onload = () => ingest(String(r.result), f.name);
    r.readAsText(f);
  }, [ingest]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  };

  const useSample = () => {
    fetch(`${import.meta.env.BASE_URL}sample.vcf`).then((r) => r.text()).then((t) => ingest(t, "sample.vcf"));
  };

  const run = () => {
    if (!parsed) return;
    sessionStorage.setItem(LIVE_KEY, JSON.stringify(buildLiveReport(parsed)));
    navigate(`/process/live?vcf=${encodeURIComponent(parsed.filename)}`);
  };

  return (
    <div className="gl-page" style={{ maxWidth: 980 }}>
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>New analysis
      </div>
      <div className="gl-page-title"><UploadIcon size={20} /><h1>New molecular analysis</h1></div>
      <p className="gl-page-desc">
        Drop a tumour VCF — it is parsed in your browser, no upload to a server — then run it through
        the TSO500 tertiary-analysis pipeline. Or start from a demo case.
      </p>

      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          marginTop: 24, marginBottom: 20, padding: "40px 24px", textAlign: "center",
          border: `2px dashed ${dragging ? "var(--blue-500)" : "var(--border-strong)"}`,
          background: dragging ? "var(--blue-50)" : "var(--bg-subtle)",
          borderRadius: "var(--radius)", transition: "all .12s",
        }}
      >
        <div style={{ color: "var(--text-muted)", marginBottom: 12 }}><UploadIcon size={32} /></div>
        <div className="gl-strong" style={{ fontSize: 16 }}>Drag a .vcf / .vcf.gz file here</div>
        <div className="gl-text-sm gl-text-muted" style={{ marginTop: 6 }}>
          or{" "}
          <label className="gl-link-button" style={{ cursor: "pointer" }}>
            browse<input type="file" accept=".vcf,.txt" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </label>
          {" · "}
          <button className="gl-link-button" onClick={useSample}>use a sample VCF</button>
        </div>
      </div>

      {err && <div className="gl-card" style={{ borderColor: "var(--red-100)", marginBottom: 20 }}><div className="gl-card-body" style={{ color: "var(--red-700)" }}>{err}</div></div>}

      {/* live parse result */}
      {parsed && (
        <div style={{ marginBottom: 28 }}>
          <GlCard header={<>Parsed <span className="mono">{parsed.filename}</span> — in your browser</>}>
            <div className="gl-row gl-wrap" style={{ gap: 24, marginBottom: 16 }}>
              <Stat n={parsed.total} label="PASS variants" />
              <Stat n={parsed.somatic} label="Somatic" />
              <Stat n={parsed.variants.filter((v) => v.gene).length} label="In actionable genes" />
              <Stat n={parsed.actionable.length} label="Tier I–II" color="var(--blue-600)" />
              <div style={{ alignSelf: "center" }}><GlBadge variant="neutral">{parsed.reference}</GlBadge></div>
            </div>

            {parsed.variants.filter((v) => v.gene).length > 0 ? (
              <div className="gl-table-card">
                <table className="gl-table">
                  <thead><tr><th>Gene</th><th>Change</th><th>Locus</th><th>AF</th><th>Match</th><th>ESCAT</th></tr></thead>
                  <tbody>
                    {parsed.variants.filter((v) => v.gene).slice(0, 12).map((v, i) => (
                      <tr key={i}>
                        <td className="mono gl-strong">{v.gene}</td>
                        <td className="mono gl-text-sm">{v.annKind === "hotspot" ? v.alteration : "—"}</td>
                        <td className="mono gl-text-xs gl-text-muted">{v.chrom}:{v.pos} {v.ref}&gt;{v.alt}</td>
                        <td className="mono gl-text-sm">{v.af != null ? v.af.toFixed(2) : "—"}</td>
                        <td><GlBadge variant={v.annKind === "hotspot" ? "info" : "neutral"}>{v.annKind === "hotspot" ? "Known hotspot" : "Gene region"}</GlBadge></td>
                        <td>{v.tier ? <GlBadge variant={ESCAT_META[v.tier].variant}>{ESCAT_META[v.tier].short}</GlBadge> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
                No variants fell in the bundled actionable-gene set. The full pipeline (VEP) annotates the complete gene set.
              </p>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
              <button className="gl-button gl-button-confirm" onClick={run}>
                <BeakerIcon size={14} /> Run tertiary analysis →
              </button>
              <span className="gl-text-xs gl-text-muted">
                Gene tags are region/hotspot matches against a bundled hg19 set — the full run adds VEP + OncoKB + ESCAT + literature.
              </span>
            </div>
          </GlCard>
        </div>
      )}

      {/* demo cases */}
      <div className="gl-section-title">Or start from a demo case</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {(rows ?? []).map((r) => (
          <GlCard key={r.chartNo}>
            <div className="gl-row gl-center gl-between" style={{ marginBottom: 6 }}>
              <span className="gl-strong">{r.cancerType}</span>
              <GlBadge variant={r.actionableCount > 0 ? "info" : "neutral"}>{r.actionableCount} actionable</GlBadge>
            </div>
            <div className="gl-text-xs gl-text-muted mono" style={{ marginBottom: 4 }}>{r.sampleId}</div>
            <div className="gl-text-xs gl-text-muted">{r.stage} · {r.topFindings}</div>
            <div style={{ marginTop: 12 }}>
              <button className="gl-button gl-button-confirm" onClick={() => navigate(`/process/${r.chartNo}`)}>
                <BeakerIcon size={14} /> Run pipeline
              </button>
            </div>
          </GlCard>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, color: color ?? "var(--text)" }}>{n}</div>
      <div className="gl-text-xs gl-text-muted">{label}</div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorklistEntry, Report } from "../types";
import { loadWorklist, loadReport } from "../lib/data";
import { reportToIgv, igvTrack, type IgvFeature } from "../lib/igvFeatures";
import { GlCard, ScaleIcon, ServerIcon } from "../components/gl";
import IgvBrowser from "../components/IgvBrowser";

interface Track { name: string; type: string; features: unknown[]; height?: number; displayMode?: string }

export default function Batch() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorklistEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [locus, setLocus] = useState("chr7:140419127-140624564");
  const [totals, setTotals] = useState({ samples: 0, features: 0, actionable: 0 });

  useEffect(() => {
    loadWorklist().then((r) => { setRows(r); setSelected(new Set(r.map((x) => x.chartNo))); }).catch(() => setRows([]));
  }, []);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function run() {
    if (!rows) return;
    setRunning(true); setTracks(null);
    const chosen = rows.filter((r) => selected.has(r.chartNo));
    const reports = await Promise.all(chosen.map((r) => loadReport(r.chartNo).catch(() => null)));
    const built: Track[] = [];
    let allFeatures: IgvFeature[] = [];
    let actionable = 0;
    let firstLocus = "";
    for (let i = 0; i < reports.length; i++) {
      const rep = reports[i] as Report | null;
      if (!rep) continue;
      const { features, locus: l } = reportToIgv(rep);
      if (!features.length) continue;
      if (!firstLocus) firstLocus = l;
      allFeatures = allFeatures.concat(features);
      actionable += rep.variants.filter((v) => v.escat === "I" || v.escat === "II").length;
      built.push(igvTrack(chosen[i].name, features));
    }
    setTotals({ samples: built.length, features: allFeatures.length, actionable });
    if (firstLocus) setLocus(firstLocus);
    // brief "real-time" beat before the browser mounts
    setTimeout(() => { setTracks(built); setRunning(false); }, 500);
  }

  const legend = useMemo(() => ([
    { c: "#108548", label: "Tier I" }, { c: "#1f75cb", label: "Tier II" },
    { c: "#c17d10", label: "Tier III" }, { c: "#bfbfc3", label: "Tier X" },
  ]), []);

  return (
    <div className="gl-page" style={{ maxWidth: 1100 }}>
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>Batch analysis
      </div>
      <div className="gl-page-title"><ServerIcon size={20} /><h1>Batch analysis &amp; genome view</h1></div>
      <p className="gl-page-desc">
        Select a batch of sequenced samples and visualise their actionable variants together on the
        GRCh37 genome (IGV.js), coloured by ESCAT tier.
      </p>

      {rows && (
        <GlCard style={{ marginTop: 16 }}>
          <div className="gl-row gl-center gl-between gl-wrap" style={{ marginBottom: 12 }}>
            <div className="gl-section-title" style={{ margin: 0 }}>Samples ({selected.size})</div>
            <button className="gl-button gl-button-confirm" disabled={selected.size === 0 || running}
              style={selected.size === 0 || running ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={run}>
              <ScaleIcon size={14} /> {running ? "Running…" : "Run batch"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
            {rows.map((r) => {
              const on = selected.has(r.chartNo);
              return (
                <div key={r.chartNo} className={`gl-picker-card${on ? " on" : ""}`} onClick={() => toggle(r.chartNo)}>
                  <div className="gl-strong gl-text-sm">{r.name}</div>
                  <div className="gl-text-xs gl-text-muted mono">{r.sampleId}</div>
                  <div className="gl-text-xs gl-text-muted">{r.cancerType} · {r.actionableCount} actionable</div>
                </div>
              );
            })}
          </div>
        </GlCard>
      )}

      {tracks && (
        <div style={{ marginTop: 16 }}>
          <div className="gl-row gl-center gl-between gl-wrap" style={{ marginBottom: 8 }}>
            <div className="gl-text-sm gl-text-muted">
              {totals.samples} samples · {totals.features} plotted variants · {totals.actionable} Tier I–II
            </div>
            <div className="gl-batch-legend">
              {legend.map((l) => <span key={l.label} className="gl-legend-dot"><i style={{ background: l.c }} />{l.label}</span>)}
            </div>
          </div>
          <IgvBrowser tracks={tracks} locus={locus} />
          <p className="gl-text-xs gl-text-muted" style={{ marginTop: 8 }}>
            One track per sample. Variants placed at their hg19 loci (exact hotspot position where known,
            else gene midpoint). Reference sequence and cytobands stream from the IGV genome service.
          </p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { WorklistEntry } from "../types";
import { loadWorklist } from "../lib/data";
import { GlCard, GlBadge, UploadIcon, BeakerIcon } from "../components/gl";

export default function Upload() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorklistEntry[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => { loadWorklist().then(setRows).catch(() => setRows([])); }, []);

  // Any dropped/selected VCF routes into the flagship demo case (the pipeline
  // cannot run in-browser; the flagship shows a complete real-data result).
  const flagship = useMemo(() => rows?.[0]?.chartNo ?? "99231004", [rows]);

  const onFile = useCallback((name: string) => {
    setPicked(name);
    setTimeout(() => navigate(`/process/${flagship}?vcf=${encodeURIComponent(name)}`), 400);
  }, [flagship, navigate]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    onFile(f ? f.name : "sample.vcf");
  };

  return (
    <div className="gl-page" style={{ maxWidth: 900 }}>
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>
        New analysis
      </div>
      <div className="gl-page-title"><UploadIcon size={20} /><h1>New molecular analysis</h1></div>
      <p className="gl-page-desc">
        Upload a tumour VCF to run it through the TSO500 tertiary-analysis pipeline, or start from a
        demo case.
      </p>

      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          marginTop: 24, marginBottom: 28, padding: "48px 24px", textAlign: "center",
          border: `2px dashed ${dragging ? "var(--blue-500)" : "var(--border-strong)"}`,
          background: dragging ? "var(--blue-50)" : "var(--bg-subtle)",
          borderRadius: "var(--radius)", transition: "all .12s",
        }}
      >
        <div style={{ color: "var(--text-muted)", marginBottom: 12 }}><UploadIcon size={32} /></div>
        <div className="gl-strong" style={{ fontSize: 16 }}>
          {picked ? `Queued ${picked}…` : "Drag a .vcf / .vcf.gz file here"}
        </div>
        <div className="gl-text-sm gl-text-muted" style={{ marginTop: 6 }}>
          or{" "}
          <label className="gl-link-button" style={{ cursor: "pointer" }}>
            browse
            <input type="file" accept=".vcf,.gz" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0].name)} />
          </label>
          {" "}· hard-filtered somatic VCF from the TSO500 panel
        </div>
      </div>

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

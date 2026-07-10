import { useSyncExternalStore, useState } from "react";
import {
  subscribeAudit, getAuditEvents, clearAudit, exportAuditJson,
  type AuditEvent, type TrustClass,
} from "../lib/audit";
import { GlBadge, ListIcon } from "./gl";
import type { BadgeVariant } from "./gl";

// Global, always-reachable audit trail. Mounted once at the app root (beside the
// router) so every page's operations land in one inspectable log. Subscribes to
// the audit store via useSyncExternalStore — no prop threading.

const TRUST_META: Record<TrustClass, { label: string; variant: BadgeVariant }> = {
  deterministic: { label: "code", variant: "neutral" },
  model: { label: "model", variant: "info" },
  "external-api": { label: "external", variant: "warning" },
  human: { label: "human", variant: "success" },
};

const ALL_TRUST: TrustClass[] = ["deterministic", "model", "external-api", "human"];

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function AuditDrawer() {
  const events = useSyncExternalStore(subscribeAudit, getAuditEvents, getAuditEvents);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Set<TrustClass>>(new Set(ALL_TRUST));

  const shown = events.filter((e) => active.has(e.trust));

  const toggleTrust = (t: TrustClass) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      // Never leave the filter empty — re-enable all when the last is removed.
      return next.size ? next : new Set(ALL_TRUST);
    });

  const doExport = () => {
    const blob = new Blob([exportAuditJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtb-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Floating toggle — present on every page */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Audit trail — every operation, tagged by trust class"
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 60,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 999, border: "1px solid var(--border-strong)",
          background: "var(--bg-elevated, #fff)", color: "var(--text)", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 600,
        }}
      >
        <ListIcon size={16} /> Audit
        <span className="gl-count" style={{ background: "var(--blue-500)", color: "#fff" }}>{events.length}</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.28)", zIndex: 70 }}
        />
      )}

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 92vw)", zIndex: 80,
          background: "var(--bg, #fff)", borderLeft: "1px solid var(--border-strong)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .18s ease", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="gl-row gl-center gl-between" style={{ marginBottom: 4 }}>
            <span className="gl-strong">Audit trail</span>
            <button className="gl-link-button" onClick={() => setOpen(false)}>Close ✕</button>
          </div>
          <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 10px" }}>
            Every operation, tagged by who produced it. {events.length} event(s) this session.
          </p>
          <div className="gl-row gl-wrap" style={{ gap: 6, marginBottom: 10 }}>
            {ALL_TRUST.map((t) => {
              const on = active.has(t);
              const n = events.filter((e) => e.trust === t).length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrust(t)}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", opacity: on ? 1 : 0.4 }}
                  title={on ? "Shown — click to hide" : "Hidden — click to show"}
                >
                  <GlBadge variant={TRUST_META[t].variant}>{TRUST_META[t].label} · {n}</GlBadge>
                </button>
              );
            })}
          </div>
          <div className="gl-row" style={{ gap: 8 }}>
            <button className="gl-button" onClick={doExport} disabled={!events.length}>⭳ Export JSON</button>
            <button className="gl-button" onClick={clearAudit} disabled={!events.length}>Clear</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 12px", flex: 1 }}>
          {shown.length === 0 ? (
            <p className="gl-text-sm gl-text-muted" style={{ padding: "16px 6px" }}>
              No events yet. Parse a VCF, run the appraisal agent, or sign off a report — each step lands here.
            </p>
          ) : (
            <div className="gl-col" style={{ gap: 2 }}>
              {[...shown].reverse().map((e) => <Row key={e.id} e={e} />)}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Row({ e }: { e: AuditEvent }) {
  const meta = TRUST_META[e.trust];
  const tag = e.model ?? e.source;
  const hasDetail = e.detail && Object.keys(e.detail).length > 0;
  return (
    <div style={{ padding: "8px 6px", borderBottom: "1px solid var(--border)" }}>
      <div className="gl-row gl-center gl-wrap" style={{ gap: 6 }}>
        <span className="mono gl-text-xs gl-text-muted" style={{ minWidth: 58 }}>{fmtTime(e.ts)}</span>
        <GlBadge variant={meta.variant}>{meta.label}</GlBadge>
        <span className="mono gl-text-xs gl-strong">{e.op}</span>
        {tag && <span className="gl-text-xs gl-text-muted">· {tag}</span>}
      </div>
      <div className="gl-text-sm" style={{ margin: "2px 0 0 64px" }}>{e.summary}</div>
      <div className="gl-row gl-center gl-wrap" style={{ gap: 8, margin: "2px 0 0 64px" }}>
        {e.patient && <span className="gl-text-xs gl-text-muted mono">{e.patient}</span>}
        {e.fingerprint && <span className="gl-text-xs gl-text-muted mono" title="FNV-1a content fingerprint (non-crypto)">#{e.fingerprint}</span>}
      </div>
      {hasDetail && (
        <details style={{ margin: "4px 0 0 64px" }}>
          <summary className="gl-link-button gl-text-xs">detail</summary>
          <pre className="gl-text-xs mono" style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", color: "var(--text-muted)" }}>
            {JSON.stringify(e.detail, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

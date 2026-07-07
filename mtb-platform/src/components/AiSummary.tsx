import { useState } from "react";
import type { Report } from "../types";
import { isActionable } from "../lib/format";
import { GlCard, GlBadge } from "./gl";

// Calls the /api/summary Pages Function (Anthropic) to generate an MTB
// discussion summary from the report's real findings. Degrades gracefully
// when the key isn't configured or when running without the Function (dev).
export default function AiSummary({ report }: { report: Report }) {
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unconfigured" | "error">("idle");

  async function generate() {
    setState("loading"); setText(null);
    const actionable = report.variants.filter(isActionable);
    const body = {
      patient: { cancerType: report.patient.cancerType, stage: report.patient.stage },
      biomarkers: {
        tmb: report.biomarkers.tmb, tmbClass: report.biomarkers.tmbClass,
        msi: report.biomarkers.msi, hrdStatus: report.biomarkers.hrdStatus,
      },
      findings: actionable.map((v) => ({ gene: v.gene, alteration: v.alteration, escat: v.escat, drugs: v.treatments.map((t) => t.drugs) })),
      priorTherapy: report.clinical.priorTherapy,
      reclassified: report.reannotation.events.filter((e) => e.nowActionable).map((e) => `${e.gene} ${e.alteration}`),
    };
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/summary`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.status === 503) { setState("unconfigured"); return; }
      if (!res.ok) { setState("error"); return; }
      const data = await res.json();
      setText(data.summary || ""); setState("idle");
    } catch { setState("error"); }
  }

  return (
    <GlCard header={<>✦ MTB AI summary <GlBadge variant="info">Claude</GlBadge></>}>
      {text ? (
        <p className="gl-text-sm" style={{ whiteSpace: "pre-line", lineHeight: 1.6, margin: 0 }}>{text}</p>
      ) : (
        <p className="gl-text-sm gl-text-muted" style={{ margin: 0 }}>
          Generate a discussion summary from this patient's molecular findings.
        </p>
      )}
      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <button className="gl-button gl-button-confirm" onClick={generate} disabled={state === "loading"}
          style={state === "loading" ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {state === "loading" ? "Generating…" : text ? "Regenerate" : "✦ Generate summary"}
        </button>
        {state === "unconfigured" && <span className="gl-text-xs gl-text-muted">Set the ANTHROPIC_API_KEY secret to enable.</span>}
        {state === "error" && <span className="gl-text-xs" style={{ color: "var(--red-700)" }}>Could not reach the summary service.</span>}
      </div>
    </GlCard>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Report, EscatTier } from "../types";
import { loadReport } from "../lib/data";
import { ESCAT_META, isActionable } from "../lib/format";
import { GlBadge } from "../components/gl";
import Redacted from "../components/Redacted";
import { buildSlides, type Slide } from "../lib/deck";

type NarrateState = "idle" | "loading" | "unconfigured" | "error";

// Full-screen, keyboard-navigable, printable case-presentation deck. Slides are
// modelled by lib/deck.ts; this page renders them one at a time on screen (and
// all of them, stacked, for print/PDF) and wires an optional Anthropic-backed
// narration draft that degrades gracefully when the Function isn't configured.
export default function Deck() {
  const { chartNo } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  // Live narration overrides, keyed by slide kind — filled by "Draft narration"
  // without mutating the immutable slide objects from buildSlides().
  const [narration, setNarration] = useState<Record<string, string>>({});
  const [narrateState, setNarrateState] = useState<NarrateState>("idle");

  useEffect(() => {
    if (!chartNo) return;
    setReport(null);
    loadReport(chartNo).then(setReport).catch((e) => setError(e.message));
  }, [chartNo]);

  const slides = report ? buildSlides(report) : [];
  const n = slides.length;

  // Keyboard navigation: arrows/space to move, f for fullscreen, p to print.
  useEffect(() => {
    if (n === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        if (e.key === " ") e.preventDefault();
        setIdx((i) => Math.min(i + 1, n - 1));
      } else if (e.key === "ArrowLeft") {
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "f") {
        document.documentElement.requestFullscreen?.();
      } else if (e.key === "p") {
        window.print();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n]);

  async function draftNarration() {
    if (!report) return;
    setNarrateState("loading");
    const body = {
      patient: { cancerType: report.patient.cancerType, stage: report.patient.stage },
      biomarkers: {
        tmb: report.biomarkers.tmb, tmbClass: report.biomarkers.tmbClass,
        msi: report.biomarkers.msi, hrdStatus: report.biomarkers.hrdStatus,
      },
      findings: report.variants.filter(isActionable).map((v) => ({
        gene: v.gene, alteration: v.alteration, escat: v.escat, drugs: v.treatments.map((t) => t.drugs),
      })),
      priorTherapy: report.clinical.priorTherapy,
    };
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/narrate`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.status === 503) { setNarrateState("unconfigured"); return; }
      if (!res.ok) { setNarrateState("error"); return; }
      const data = await res.json();
      const text = data.narration || "";
      setNarration({ evidence: text });
      setNarrateState("idle");
    } catch { setNarrateState("error"); }
  }

  if (error) {
    return (
      <div className="gl-page">
        <div className="gl-card" style={{ borderColor: "var(--red-100)" }}>
          <div className="gl-card-body" style={{ color: "var(--red-700)" }}>{error}</div>
        </div>
      </div>
    );
  }
  if (!report) return <div className="gl-page"><div className="gl-spinner" /></div>;

  const active = slides[idx];

  return (
    <>
      {/* Interactive single-slide view (hidden in print). */}
      <div className="gl-deck">
        {renderSlide(active, narration, narrateState, draftNarration)}
      </div>

      {/* Stacked all-slides view — only shown in print so the PDF has every slide. */}
      <div className="gl-deck-print">
        {slides.map((s, i) => (
          <div key={i}>{renderSlide(s, narration, narrateState, draftNarration)}</div>
        ))}
      </div>

      {/* Footer chrome (hidden in print). */}
      <div className="gl-deck-chrome">
        <button className="gl-button" onClick={() => navigate(`/report/${chartNo}`)}>← Back</button>
        <div className="gl-deck-nav">
          <button className="gl-button" onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0}>‹ Prev</button>
          <span className="gl-deck-counter mono">{idx + 1} / {n}</span>
          <button className="gl-button" onClick={() => setIdx((i) => Math.min(i + 1, n - 1))} disabled={idx === n - 1}>Next ›</button>
        </div>
        <button className="gl-button" onClick={() => window.print()}>Print / PDF</button>
      </div>
    </>
  );
}

function escatShort(escat: string): string {
  return ESCAT_META[escat as EscatTier]?.short ?? escat;
}

function escatVariant(escat: string) {
  return ESCAT_META[escat as EscatTier]?.variant ?? "neutral";
}

function renderSlide(
  slide: Slide,
  narration: Record<string, string>,
  narrateState: NarrateState,
  draftNarration: () => void,
) {
  switch (slide.kind) {
    case "title":
      return (
        <div className="gl-slide gl-slide-title">
          <img src={`${import.meta.env.BASE_URL}kfsyscc-logo.webp`} alt="" height={40} style={{ marginBottom: 24 }} />
          <h1 className="gl-slide-h">{slide.title}</h1>
          <div className="gl-slide-patient"><Redacted>{slide.patientName}</Redacted></div>
          <div className="gl-slide-sub">{slide.subtitle}</div>
          <div className="gl-slide-meta gl-text-muted mono">{slide.meta}</div>
        </div>
      );

    case "history":
    case "recommendation":
      return (
        <div className="gl-slide">
          <h2 className="gl-slide-h">{slide.title}</h2>
          <ul className="gl-slide-list">
            {slide.bullets?.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      );

    case "molecular":
      return (
        <div className="gl-slide">
          <h2 className="gl-slide-h">{slide.title}</h2>
          <div className="gl-row gl-wrap" style={{ gap: 8, marginBottom: 24 }}>
            {slide.biomarkerBadges?.map((b) => (
              <GlBadge key={b.label} variant="neutral">{b.label}: {b.value}</GlBadge>
            ))}
          </div>
          <table className="gl-slide-table">
            <thead>
              <tr><th>Gene</th><th>Alteration</th><th>ESCAT</th></tr>
            </thead>
            <tbody>
              {slide.variantRows?.map((r, i) => (
                <tr key={i}>
                  <td className="mono gl-strong">{r.gene}</td>
                  <td className="mono">{r.alteration}</td>
                  <td>{escatShort(r.escat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "actionable":
      return (
        <div className="gl-slide">
          <h2 className="gl-slide-h">{slide.title}</h2>
          <div className="gl-slide-findings">
            {slide.findings?.map((f, i) => (
              <div key={i} className="gl-slide-finding">
                <span className="mono gl-strong">{f.gene}</span>
                <span className="mono">{f.alteration}</span>
                <GlBadge variant={escatVariant(f.escat)}>{escatShort(f.escat)}</GlBadge>
                <span className="gl-slide-drugs">{f.drugs}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "evidence":
      return (
        <div className="gl-slide">
          <h2 className="gl-slide-h">{slide.title}</h2>
          <div className="gl-slide-findings">
            {slide.findings?.map((f, i) => (
              <div key={i} className="gl-slide-finding">
                <span className="mono gl-strong">{f.gene}</span>
                <span className="mono">{f.alteration}</span>
                <GlBadge variant={escatVariant(f.escat)}>{escatShort(f.escat)}</GlBadge>
              </div>
            ))}
          </div>
          <NarrationBlock kind="evidence" narration={narration} narrateState={narrateState} draftNarration={draftNarration} withButton />
        </div>
      );

    default:
      return null;
  }
}

function NarrationBlock({
  kind, narration, narrateState, draftNarration, withButton,
}: {
  kind: string;
  narration: Record<string, string>;
  narrateState: NarrateState;
  draftNarration: () => void;
  withButton?: boolean;
}) {
  const text = narration[kind];
  return (
    <div className="gl-slide-narration">
      {text && <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{text}</p>}
      {withButton && (
        <div className="gl-row gl-center" style={{ gap: 10, marginTop: 12 }}>
          <button className="gl-button gl-button-confirm" onClick={draftNarration} disabled={narrateState === "loading"}
            style={narrateState === "loading" ? { opacity: 0.6, cursor: "wait" } : undefined}>
            {narrateState === "loading" ? "Drafting…" : text ? "Redraft narration" : "✦ Draft narration"}
          </button>
          {narrateState === "unconfigured" && <span className="gl-text-xs gl-text-muted">Set the ANTHROPIC_API_KEY secret to enable.</span>}
          {narrateState === "error" && <span className="gl-text-xs" style={{ color: "var(--red-700)" }}>Could not reach the narration service.</span>}
        </div>
      )}
    </div>
  );
}

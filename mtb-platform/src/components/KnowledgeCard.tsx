import { useState } from "react";
import type { Appraisal, LiteratureHit, Variant } from "../types";
import type { CiteSource } from "../lib/citation";
import { formatCitation } from "../lib/citation";
import { deriveKnowledge } from "../lib/pico";
import { GRADE_META, PROVENANCE_META, ESCAT_META } from "../lib/format";
import { GlCard, GlBadge, ExternalLinkIcon } from "./gl";
import CiteButton from "./CiteButton";

// ---------------------------------------------------------------------------
// Per-gene PICO-framed evidence card. When a real systematic-review Appraisal
// exists for the variant it renders the appraised layout (PICO + PRISMA funnel
// + GRADE + included studies); otherwise it derives a PICO deterministically
// and shows the gene's raw PubMed studies. A "Run robust-lit-review" button
// calls an Anthropic-backed endpoint for a live knowledge synthesis, degrading
// gracefully like AiSummary when the key isn't configured.
// ---------------------------------------------------------------------------

interface StudyRow {
  source: CiteSource;
  quartile?: "Q1" | "Q2" | "Q3" | "Q4";
  verified?: boolean;
  openAccess?: boolean;
  citationCount?: number;
}

export default function KnowledgeCard({
  variant,
  appraisal,
  literature,
  cancerType,
}: {
  variant: Variant;
  appraisal?: Appraisal;
  literature: LiteratureHit[];
  cancerType: string;
}) {
  const derived = appraisal ? null : deriveKnowledge(variant, cancerType, literature);

  const pico = appraisal ? appraisal.pico : derived!.pico;
  const grade = appraisal ? appraisal.grade : derived!.grade;
  const verdict = appraisal ? appraisal.verdict : derived!.verdict;

  const rows: StudyRow[] = appraisal
    ? appraisal.includedStudies.map((s) => ({
        source: { authors: s.authors, title: s.title, journal: s.journal, year: s.year, pmid: s.pmid },
        quartile: s.quartile,
        verified: s.verified,
        openAccess: s.openAccess,
        citationCount: s.citationCount,
      }))
    : derived!.studies.map((s) => ({ source: s }));

  const studies = rows.map((r) => r.source);
  const gradeMeta = GRADE_META[grade];

  // ── Live synthesis (Anthropic, graceful degradation) ──────────────────────
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unconfigured" | "error">("idle");

  async function runLitReview() {
    setState("loading");
    setSynthesis(null);
    const body = {
      gene: variant.gene,
      alteration: variant.alteration,
      cancerType,
      pico: { question: pico.question },
      studies: studies.map((s) => ({ title: s.title, journal: s.journal, year: s.year, pmid: s.pmid })),
    };
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/litreview`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.status === 503) { setState("unconfigured"); return; }
      if (!res.ok) { setState("error"); return; }
      const data = await res.json();
      setSynthesis(data.synthesis || ""); setState("idle");
    } catch { setState("error"); }
  }

  const baseText = variant.narrative
    ? variant.narrative
    : `${grade} certainty. ${verdict}. Based on ${studies.length} retrieved record(s); run the pipeline for an appraised synthesis.`;

  // ── Export AMA references ─────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  async function exportRefs() {
    try {
      await navigator.clipboard.writeText(studies.map((s, i) => `${i + 1}. ${formatCitation(s)}`).join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <GlCard
      header={
        <div className="gl-row gl-center gl-wrap" style={{ gap: 8, width: "100%" }}>
          <span className="mono gl-strong">{variant.gene}</span>
          <span className="mono gl-text-muted">{variant.alteration}</span>
          <GlBadge variant={ESCAT_META[variant.escat].variant}>{ESCAT_META[variant.escat].short}</GlBadge>
          <span className="gl-grow" />
          {appraisal
            ? <GlBadge variant={PROVENANCE_META[appraisal.provenance].variant}>{PROVENANCE_META[appraisal.provenance].label}</GlBadge>
            : <GlBadge variant="neutral">Derived</GlBadge>}
          <GlBadge variant={gradeMeta.variant}>{gradeMeta.label}</GlBadge>
        </div>
      }
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{verdict}</div>
      <p className="gl-text-sm gl-text-secondary" style={{ margin: "0 0 14px" }}>{pico.question}</p>

      {/* PICO */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 16, rowGap: 4, marginBottom: 16 }}>
        <Pico k="Population" v={pico.population} />
        <Pico k="Intervention" v={pico.intervention} />
        <Pico k="Comparator" v={pico.comparator} />
        <Pico k="Outcome" v={pico.outcome} />
      </div>

      {/* PRISMA funnel (appraised) or provenance line (derived) */}
      {appraisal ? (
        <PrismaFunnel a={appraisal} />
      ) : (
        <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 16px" }}>
          Derived PICO · {literature.length} PubMed record(s) retrieved · not yet formally appraised
        </p>
      )}

      {/* Knowledge synthesis */}
      <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>Knowledge synthesis</div>
      <p className="gl-text-sm" style={{ whiteSpace: "pre-line", lineHeight: 1.6, margin: 0 }}>
        {synthesis ?? baseText}
      </p>
      <div style={{ marginTop: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="gl-button gl-button-confirm" onClick={runLitReview} disabled={state === "loading"}
          style={state === "loading" ? { opacity: 0.6, cursor: "wait" } : undefined}>
          {state === "loading" ? "Appraising…" : synthesis ? "Re-run" : "✦ Run robust-lit-review"}
        </button>
        {state === "unconfigured" && <span className="gl-text-xs gl-text-muted">Set the ANTHROPIC_API_KEY secret to enable.</span>}
        {state === "error" && <span className="gl-text-xs" style={{ color: "var(--red-700)" }}>Could not reach the appraisal service.</span>}
      </div>

      {/* Included studies */}
      <details className="gl-disclosure">
        <summary className="gl-link-button" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          Included studies ({rows.length})
        </summary>
        <div className="gl-col" style={{ gap: 10, marginTop: 10 }}>
          {rows.map((r, i) => (
            <div key={(r.source.pmid ?? r.source.title) + i} style={{ paddingBottom: 10, borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
              {r.quartile && (
                <div className="gl-row gl-center" style={{ gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                  <GlBadge variant={r.quartile === "Q1" ? "success" : "neutral"}>{r.quartile}</GlBadge>
                  {r.verified && <GlBadge variant="info">Verified</GlBadge>}
                  {r.openAccess && <GlBadge variant="neutral">Open access</GlBadge>}
                  <span className="gl-text-xs gl-text-muted">{r.citationCount} citations</span>
                </div>
              )}
              <div className="gl-strong gl-text-sm">{r.source.title}</div>
              <div className="gl-text-xs gl-text-muted">{r.source.authors} · <em>{r.source.journal}</em> · {r.source.year}</div>
              {r.source.pmid && <PmidLink pmid={r.source.pmid} />}
              <CiteButton source={r.source} />
            </div>
          ))}
        </div>
      </details>

      {/* Footer: export references */}
      <div style={{ marginTop: 14 }}>
        <button type="button" className="gl-link-button" onClick={exportRefs}>
          {copied ? "✓ Copied" : "Export AMA references"}
        </button>
      </div>
    </GlCard>
  );
}

function PrismaFunnel({ a }: { a: Appraisal }) {
  const p = a.prisma;
  const max = p.totalFound || 1;
  const funnelRows: { label: string; value: number; included?: boolean }[] = [
    { label: "Records found", value: p.totalFound },
    { label: "After de-duplication", value: p.afterDedup },
    { label: "After year filter", value: p.afterYearFilter },
    { label: "After quality (Q1)", value: p.afterQuality },
    { label: "Included", value: p.included, included: true },
  ];
  return (
    <>
      <div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>PRISMA 2020 selection</div>
      <div className="gl-funnel" style={{ marginBottom: 16 }}>
        {funnelRows.map((r) => (
          <div className="gl-funnel-row" key={r.label}>
            <span className="gl-funnel-label">{r.label}</span>
            <span className="gl-funnel-track">
              <span className={`gl-funnel-bar${r.included ? " included" : ""}`} style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }}>
                {r.value}
              </span>
            </span>
          </div>
        ))}
        <div className="gl-funnel-row">
          <span className="gl-funnel-label" />
          <span className="gl-funnel-excl">{p.excludedByQuality} excluded at quality screening</span>
        </div>
      </div>
    </>
  );
}

function Pico({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="gl-text-xs gl-text-muted" style={{ whiteSpace: "nowrap" }}>{k}</span>
      <span className="gl-text-sm">{v}</span>
    </>
  );
}

function PmidLink({ pmid }: { pmid: string }) {
  return (
    <a href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noreferrer"
      className="mono gl-text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
      PMID {pmid} <ExternalLinkIcon size={12} />
    </a>
  );
}

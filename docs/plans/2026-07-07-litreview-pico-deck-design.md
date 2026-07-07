# Literature Review, Per-Gene PICO Knowledge & Case Presentation Deck — Design

**Date:** 2026-07-07
**Status:** Approved (brainstorm complete)
**Scope:** `mtb-platform/`

## Summary

Three related features that turn the platform's existing molecular findings into
appraised, board-ready knowledge:

- **A. Per-gene PICO → lit-review knowledge** — every annotated variant becomes a
  PICO-framed knowledge card in the report's **Literature** tab, backed by the
  `robust-lit-review` contract (PICO + PRISMA + GRADE + verified studies).
- **B. Citations** — AMA (medical default) citation generation with copy-to-clipboard
  and a mybib.com hand-off, plus one-click AMA reference-list export.
- **C. Case presentation deck** — a per-patient, in-app, navigable slide deck
  (`/deck/:chartNo`) for live use in the Molecular Tumor Board, printable to PDF.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Placement of A | Enhance the report's **Literature** tab |
| Gen-AI backend | **Hybrid**: curated/offline base + one-click **live** enrichment. All Gen AI uses the **Anthropic API** via Cloudflare Pages Functions (same graceful-degradation pattern as `functions/api/summary.ts`). |
| Deck delivery | In-app navigable deck + browser print/PDF (no external reveal.js — zero external deps, CSP-safe) |
| Citation style | **AMA default**; Vancouver/APA optional; Copy + mybib.com link |
| PICO coverage | **All** annotated variants (not only ESCAT I–III) |
| Patient name in deck | **Blurred by default, click to reveal** (`<Redacted>`) |

## Architecture

Shared pure-function libs + two new Pages Functions mirroring `summary.ts`.

```
New files
  src/lib/pico.ts                  variant → deterministic PICO (reuses research.ts buildQuestion)
  src/lib/citation.ts              study → AMA(default)/Vancouver/APA + mybib URL
  src/lib/deck.ts                  report → slide model (slides[])
  src/components/KnowledgeCard.tsx  per-gene PICO + knowledge synthesis + citations
  src/components/CiteButton.tsx     Cite (AMA) copy + style switch + mybib ↗
  src/components/Redacted.tsx       blur-until-click PHI wrapper
  src/pages/Deck.tsx               full-screen navigable case deck (route /deck/:chartNo)
  functions/api/litreview.ts       live: PICO + studies → GRADE knowledge synthesis
  functions/api/narrate.ts         live: report → deck narration / assessment (or reuse summary)

Changed
  src/components/LiteratureTab.tsx  render a KnowledgeCard per gene (real appraisal or curated base)
  src/pages/Report.tsx             header "▷ Present case" → opens /deck/:chartNo
  src/main.tsx                     register /deck/:chartNo route
```

### Hybrid data flow

Every knowledge card and slide renders immediately from a **curated base** (existing
appraisal, or deterministically derived from the variant + literature). A
**"✦ Run robust-lit-review"** / **"✦ Draft narration"** button then calls the Anthropic
Pages Function for a live synthesis. If `ANTHROPIC_API_KEY` is unset the Function
returns 503 and the UI shows the same hint as `AiSummary` — demo-safe offline, real AI
when configured.

## Feature A — Per-gene knowledge card

`LiteratureTab` becomes gene-centric: iterate `report.variants`, render one
`KnowledgeCard` each. Resolution priority:

1. **Existing appraisal** → use real PICO + PRISMA funnel + GRADE + includedStudies.
2. **No appraisal** → `pico.ts` derives deterministically:
   - Population = `patient.cancerType`
   - Intervention = first treatment's `drugs` (else "targeted therapy under investigation")
   - Comparator = "standard of care"; Outcome by ESCAT/drug class (PFS/OS)
   - `buildQuestion()` (reused from `research.ts`) assembles the PICO sentence
   - GRADE mapped from ESCAT / OncoKB level (I·LEVEL_1→High … X→Very Low)
   - Included studies = that gene's `report.literature` hits

Card layout reuses the `AppraisalCard` visual language:

```
[GENE alteration] [ESCAT] … [GRADE] [provenance]
verdict (one line)
PICO (4 fields)
PRISMA funnel  (real when available; else estimated from literature count)
── Knowledge synthesis ──
curated base text  /  ✦ Run robust-lit-review → live synthesis (GRADE call + 3–5 evidence points)
▸ Included studies (n)   each with CiteButton + PMID link
[Export AMA references]
```

`/api/litreview` receives `{gene, alteration, cancerType, pico, studies[]}`. System
prompt: judge **only** from the provided studies, output a GRADE call + bulleted
evidence + one caveat, ≤200 words, never invent PMIDs. Response text fills the
synthesis area.

**YAGNI:** no real multi-database search / DOI validation here — that is
`robust-lit-review` proper. This surface presents the contract and the synthesis.

## Feature B — Citations

`src/lib/citation.ts` (pure, dependency-free):

```ts
type Style = "ama" | "vancouver" | "apa";
formatCitation(study, style = "ama"): string
mybibUrl(study): string   // opens mybib AMA generator with DOI/PMID
```

- **AMA (default):** `Authors. Title. Journal. Year;Vol(Issue):Pages.` from existing
  `IncludedStudy` / `LiteratureHit` fields; gracefully omit missing vol/issue/pages;
  append `PMID: xxxxx`.
- Authors field is a single string already — light normalization only; ">6 authors →
  et al." handled if the string is comma-separated, no over-engineering.
- `CiteButton`: primary **Cite (AMA)** copies the formatted string
  (`navigator.clipboard`, shows ✓ Copied); dropdown switches Vancouver/APA; small
  **mybib ↗** link opens `https://www.mybib.com/tools/ama-citation-generator` with the
  identifier for fine-tuning/export.
- Card footer **Export AMA references**: numbered, copy-ready AMA reference list for all
  included studies on the card.

## Feature C — Case presentation deck

New route `/deck/:chartNo` → `Deck.tsx` (full-screen). `Report.tsx` header gains
"▷ Present case". `deck.ts` builds `slides[]` deterministically from the report:

1. **Title** — patient one-liner (cancerType, stage, sample/panel, report date) +
   institution logo; patient name wrapped in `<Redacted>` (blur, click to reveal).
2. **Clinical history** — consult reason, prior therapy, ECOG, chemo course.
3. **Molecular profile** — biomarkers (TMB/MSI/HRD) + variant summary table.
4. **Actionable findings** — ESCAT I–II with matched drugs (key slide).
5. **Evidence** — per-finding GRADE + key trials (draws on Feature A knowledge).
6. **Recommendation / questions for the board.**

- Navigation: ← → / Space to page, `f` fullscreen, `p` / browser print → PDF
  (`@media print`, one slide per page). Pure CSS, no external reveal.js.
- **✦ Draft narration** calls `/api/narrate` (or reuses `summary`) to produce the
  assessment + board recommendation text into slides 5/6.
- Styling uses existing `gl-*` tokens; presentation mode enlarges type.

## Non-goals (YAGNI)

- Real Scopus/Embase/CrossRef/Unpaywall calls (owned by `robust-lit-review` proper).
- .pptx export (browser print/PDF covers the demo need).
- Persisting live synthesis to the report JSON (session-only).

## Testing / verification

- Offline: every card and slide renders with the dev server and no API key (503 path).
- Type-check + oxlint clean; deck prints to a clean multi-page PDF.
- Citation output spot-checked against AMA format for a known PMID.

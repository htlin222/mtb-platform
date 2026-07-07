# Per-Gene PICO Knowledge, AMA/mybib Citations & Case Deck — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three features to the MTB platform — per-gene PICO lit-review knowledge cards, AMA-default citation generation with mybib hand-off, and a per-patient case-presentation deck — all with a curated offline base plus one-click Anthropic-powered enrichment.

**Architecture:** New pure-function libs (`pico`, `citation`, `deck`) drive React components (`KnowledgeCard`, `CiteButton`, `Redacted`, `Deck` page). Two Cloudflare Pages Functions (`litreview`, `narrate`) mirror the existing `summary.ts` graceful-degradation pattern for live Anthropic synthesis. Pure libs are TDD'd with Vitest; UI/Functions verified via `tsc` build, `oxlint`, and manual dev-server checks.

**Tech Stack:** React 18 + TypeScript, Vite, react-router-dom (HashRouter), Cloudflare Pages Functions, Anthropic Messages API, Vitest (new dev dep), existing `gl-*` / Pajamas CSS.

**Working directory:** `mtb-platform/` inside worktree `.worktrees/litreview-pico-deck` (branch `feature/litreview-pico-deck`).

**Design reference:** `docs/plans/2026-07-07-litreview-pico-deck-design.md`

**Verification note:** This repo has no test runner. Task 0 adds Vitest for pure libs only. React components and Pages Functions are verified by `pnpm build` (tsc typecheck + vite) + `./node_modules/.bin/oxlint` (must add no new errors; pre-existing warnings OK) + manual `pnpm dev` checks. All Gen AI uses the Anthropic API; with no key the Functions return 503 and the UI degrades — offline demo must always render.

---

### Task 0: Add Vitest for pure-function libs

**Files:**
- Modify: `mtb-platform/package.json` (devDeps + `test` script)
- Create: `mtb-platform/vitest.config.ts`

**Step 1:** Install Vitest.
```bash
cd mtb-platform && pnpm add -D vitest@^3
```

**Step 2:** Add `"test": "vitest run"` to `package.json` scripts (keep existing scripts).

**Step 3:** Create `mtb-platform/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts"] } });
```

**Step 4:** Verify runner works with no tests yet.
Run: `pnpm test`
Expected: exits 0 with "No test files found" (or passes) — confirms wiring.

**Step 5:** Commit.
```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: add Vitest for pure-function libs"
```

---

### Task 1: `citation.ts` — AMA/Vancouver/APA formatting (TDD)

**Files:**
- Create: `mtb-platform/src/lib/citation.ts`
- Test: `mtb-platform/src/lib/citation.test.ts`

Input shape (subset of `IncludedStudy` / `LiteratureHit`):
```ts
export interface CiteSource {
  authors: string; title: string; journal: string; year: string;
  pmid?: string; doi?: string; volume?: string; issue?: string; pages?: string;
}
```

**Step 1: Write failing tests** — `citation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatCitation, mybibUrl } from "./citation";

const s = { authors: "Mirza MR, Monk BJ, Herrstedt J", title: "Niraparib maintenance therapy in platinum-sensitive ovarian cancer.", journal: "N Engl J Med", year: "2016", pmid: "27717299" };

describe("formatCitation", () => {
  it("AMA is the default and ends with the period + PMID", () => {
    const out = formatCitation(s);
    expect(out).toBe("Mirza MR, Monk BJ, Herrstedt J. Niraparib maintenance therapy in platinum-sensitive ovarian cancer. N Engl J Med. 2016. PMID: 27717299");
  });
  it("AMA includes volume(issue):pages when present", () => {
    expect(formatCitation({ ...s, volume: "375", issue: "22", pages: "2154-2164" }))
      .toContain("N Engl J Med. 2016;375(22):2154-2164.");
  });
  it("collapses >6 authors to et al", () => {
    const many = "A B, C D, E F, G H, I J, K L, M N";
    expect(formatCitation({ ...s, authors: many })).toMatch(/^A B, C D, E F, G H, I J, K L, et al\./);
  });
  it("Vancouver appends period after PMID", () => {
    expect(formatCitation(s, "vancouver")).toMatch(/PMID: 27717299\.$/);
  });
  it("APA uses (year) and sentence order", () => {
    expect(formatCitation(s, "apa")).toContain("(2016).");
  });
});

describe("mybibUrl", () => {
  it("links to the AMA generator with the identifier", () => {
    expect(mybibUrl(s)).toBe("https://www.mybib.com/tools/ama-citation-generator?q=27717299");
    expect(mybibUrl({ ...s, doi: "10.1056/NEJMoa1611310" })).toContain("q=10.1056%2FNEJMoa1611310");
  });
});
```

**Step 2:** Run `pnpm test` → FAIL (module not found).

**Step 3: Implement** `citation.ts`:
```ts
export type CitationStyle = "ama" | "vancouver" | "apa";
export interface CiteSource {
  authors: string; title: string; journal: string; year: string;
  pmid?: string; doi?: string; volume?: string; issue?: string; pages?: string;
}

function authorList(raw: string): string {
  const parts = raw.split(",").map((a) => a.trim()).filter(Boolean);
  if (parts.length <= 6) return parts.join(", ");
  return parts.slice(0, 6).join(", ") + ", et al";
}
function volInfo(s: CiteSource): string {
  if (!s.volume) return "";
  const iss = s.issue ? `(${s.issue})` : "";
  const pg = s.pages ? `:${s.pages}` : "";
  return `;${s.volume}${iss}${pg}`;
}
function title(s: CiteSource): string {
  return s.title.replace(/\.\s*$/, "");
}

export function formatCitation(s: CiteSource, style: CitationStyle = "ama"): string {
  const pmid = s.pmid ? `PMID: ${s.pmid}` : "";
  if (style === "apa") {
    const vol = s.volume ? `, ${s.volume}${s.issue ? `(${s.issue})` : ""}${s.pages ? `, ${s.pages}` : ""}` : "";
    return [`${authorList(s.authors)} (${s.year}). ${title(s)}. ${s.journal}${vol}.`, pmid].filter(Boolean).join(" ").trim();
  }
  // ama & vancouver share the core; vancouver ends with a period after PMID
  const core = `${authorList(s.authors)}. ${title(s)}. ${s.journal}. ${s.year}${volInfo(s)}.`;
  if (style === "vancouver") return pmid ? `${core} ${pmid}.` : core;
  return pmid ? `${core} ${pmid}` : core;
}

export function mybibUrl(s: CiteSource): string {
  const id = s.doi || s.pmid || s.title;
  return `https://www.mybib.com/tools/ama-citation-generator?q=${encodeURIComponent(id)}`;
}
```

**Step 4:** Run `pnpm test` → PASS.

**Step 5:** Commit.
```bash
git add src/lib/citation.ts src/lib/citation.test.ts
git commit -m "feat: AMA/Vancouver/APA citation formatting + mybib link"
```

---

### Task 2: `pico.ts` — deterministic per-variant PICO + GRADE (TDD)

**Files:**
- Create: `mtb-platform/src/lib/pico.ts`
- Test: `mtb-platform/src/lib/pico.test.ts`
- Reference: `src/lib/research.ts` (reuse `buildQuestion`), `src/types/index.ts` (`Variant`, `Pico`, `GradeLevel`, `LiteratureHit`)

**Behavior:** Given a `Variant`, `cancerType`, and that gene's `LiteratureHit[]`, produce a `DerivedKnowledge`:
```ts
export interface DerivedKnowledge {
  pico: Pico;                 // reuse buildQuestion for .question
  grade: GradeLevel;          // mapped from escat/oncokbLevel
  verdict: string;            // one-line
  studies: CiteSource[];      // from literature hits
}
```
GRADE map: ESCAT `I`→High, `II`→Moderate, `III`→Low, `IV`/`X`→Very Low; bump to High if `oncokbLevel==="LEVEL_1"`.
Intervention: first treatment's `drugs`, else `"targeted therapy under investigation"`.
Outcome: `"Overall survival"` if drugs FDA-approved for advanced disease heuristic else `"Progression-free survival"` — keep simple: default `"Progression-free survival"`, `"Overall survival"` when ESCAT `I`.
Comparator: `"standard of care"`.

**Step 1: Write failing tests** — cover: BRCA1 ESCAT I LEVEL_1 → grade "High", intervention = "Niraparib", question contains cancer type; a no-treatment variant → intervention fallback; studies mapped from literature hits (authors/title/journal/year/pmid preserved).

**Step 2:** Run `pnpm test` → FAIL.

**Step 3: Implement** `pico.ts` reusing `buildQuestion` from `./research`. Map fields as above; `studies` from hits via `{authors,title,journal,year,pmid}`.

**Step 4:** Run `pnpm test` → PASS.

**Step 5:** Commit `feat: derive per-variant PICO + GRADE knowledge`.

---

### Task 3: `deck.ts` — report → slide model (TDD)

**Files:**
- Create: `mtb-platform/src/lib/deck.ts`
- Test: `mtb-platform/src/lib/deck.test.ts`
- Reference: `src/types/index.ts` (`Report`), a fixture from `public/data/reports/99231004.json`

**Behavior:** `buildSlides(report): Slide[]` returns the 6 slides described in the design:
```ts
export type SlideKind = "title" | "history" | "molecular" | "actionable" | "evidence" | "recommendation";
export interface Slide { kind: SlideKind; title: string; /* kind-specific payload fields */ }
```
Deterministic; `actionable` slide filters `variants` by `isActionable` (reuse `src/lib/format.ts`). Include a `narration?: string` field on `evidence`/`recommendation` slides, initially undefined (filled live in Task 10).

**Step 1: Write failing tests** — load the JSON fixture with `import report from "../../public/data/reports/99231004.json"`; assert `buildSlides(report)` has 6 slides in order, title slide carries patient name + cancerType, actionable slide lists BRCA1.

**Step 2:** Run `pnpm test` → FAIL.

**Step 3: Implement** `deck.ts`.

**Step 4:** Run `pnpm test` → PASS.

**Step 5:** Commit `feat: build case-presentation slide model from report`.

---

### Task 4: `CiteButton.tsx` — copy AMA + style switch + mybib

**Files:**
- Create: `mtb-platform/src/components/CiteButton.tsx`
- Reference: `src/components/gl.tsx` (`GlBadge`, `ExternalLinkIcon`), `src/lib/citation.ts`

**Spec:** Props `{ source: CiteSource }`. Renders a small **Cite (AMA)** button that copies `formatCitation(source)` via `navigator.clipboard.writeText`, then shows `✓ Copied` for ~1.5s. A tiny inline `<select>` toggles style (ama/vancouver/apa) and re-copies on change. A `mybib ↗` anchor (`href={mybibUrl(source)}` target=_blank rel=noreferrer) using `ExternalLinkIcon`. Use existing `gl-*` classes; no new CSS beyond inline styles matching neighbors.

**Verify:** `pnpm build` passes; `./node_modules/.bin/oxlint src/components/CiteButton.tsx` adds no errors.

**Commit:** `feat: CiteButton with AMA copy and mybib hand-off`.

---

### Task 5: `KnowledgeCard.tsx` — per-gene PICO + synthesis + citations

**Files:**
- Create: `mtb-platform/src/components/KnowledgeCard.tsx`
- Reference: `src/components/LiteratureTab.tsx` (reuse the `AppraisalCard` visual language — PICO grid, `gl-funnel`), `src/lib/pico.ts`, `src/lib/citation.ts`, `src/lib/format.ts` (`GRADE_META`, `ESCAT_META`, `PROVENANCE_META`).

**Spec:** Props `{ variant: Variant; appraisal?: Appraisal; literature: LiteratureHit[]; cancerType: string }`.
- If `appraisal` present → render real PICO + PRISMA funnel + GRADE + `includedStudies` (each row gets a `CiteButton`).
- Else → call `deriveKnowledge(variant, cancerType, literature)` (from `pico.ts`); render PICO, GRADE badge, estimated PRISMA (reuse `estimatePrisma` from `research.ts` with `searchTerms` ≈ derived), and derived studies each with `CiteButton`.
- **Knowledge synthesis** section: curated base line (from `variant.narrative` when present, else a templated sentence). A **✦ Run robust-lit-review** button POSTs to `${import.meta.env.BASE_URL}api/litreview` with `{gene, alteration, cancerType, pico, studies}`; states `idle|loading|unconfigured|error` exactly like `AiSummary.tsx`; on success replaces synthesis text. 503 → show "Set the ANTHROPIC_API_KEY secret to enable." 
- Footer **Export AMA references** button: copies numbered `formatCitation` list of all studies.

**Verify:** `pnpm build` passes; oxlint clean.

**Commit:** `feat: KnowledgeCard — per-gene PICO knowledge with live synthesis`.

---

### Task 6: Wire `KnowledgeCard` into `LiteratureTab`

**Files:**
- Modify: `mtb-platform/src/components/LiteratureTab.tsx`

**Spec:** Replace the current appraisal loop with a gene-centric render: for each `variant` in `report.variants`, find a matching `appraisal` (by `linkedGene`+`linkedAlteration`) and the gene's literature hits, render `<KnowledgeCard>`. Keep the raw "PubMed retrieval" section below as a collapsible reference. Preserve existing imports still used.

**Verify:** `pnpm dev`, open a report → Literature tab: every variant shows a knowledge card; actionable ones show real PRISMA/GRADE; others show derived PICO. No console errors. `pnpm build` + oxlint clean.

**Commit:** `feat: render a KnowledgeCard per gene in the Literature tab`.

---

### Task 7: `functions/api/litreview.ts` — live synthesis (Anthropic)

**Files:**
- Create: `mtb-platform/functions/api/litreview.ts`
- Reference: `mtb-platform/functions/api/summary.ts` (copy structure exactly)

**Spec:** `onRequestPost`; same `Env` (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`); 503 when key unset. Body `{gene, alteration, cancerType, pico:{question}, studies:[{title,journal,year,pmid}]}`. System prompt: *"You are an evidence-appraisal assistant for a molecular tumor board. Using ONLY the provided studies, give a one-line GRADE certainty judgement then 3–5 bullet evidence points with the trial/PMID, then one caveat. Never invent PMIDs or findings. ≤200 words. Plain text."* Build the user prompt from PICO + study list. Return `{ synthesis: text }`. Model default `claude-haiku-4-5-20251001`.

**Verify:** `pnpm build` passes. Locally without key: `KnowledgeCard`'s button shows the unconfigured hint (503 path). (Live path verified in Task 11 if a key is available.)

**Commit:** `feat: /api/litreview Anthropic synthesis endpoint`.

---

### Task 8: `Redacted.tsx` — blur-until-click PHI wrapper

**Files:**
- Create: `mtb-platform/src/components/Redacted.tsx`
- Modify: `mtb-platform/src/pajamas.css` (append `.gl-redacted` rules)

**Spec:** `Redacted({ children })`: renders a `<span className="gl-redacted">` that is `filter: blur(6px)` + `cursor:pointer` + `user-select:none`; clicking toggles a `revealed` state that removes the blur. Add a `title="Click to reveal"`.
CSS:
```css
.gl-redacted { filter: blur(6px); cursor: pointer; transition: filter .15s; user-select: none; }
.gl-redacted.revealed { filter: none; user-select: text; }
```

**Verify:** `pnpm build` + oxlint clean.

**Commit:** `feat: Redacted blur-until-click component`.

---

### Task 9: `Deck.tsx` page + route + "Present case" + print CSS

**Files:**
- Create: `mtb-platform/src/pages/Deck.tsx`
- Modify: `mtb-platform/src/main.tsx` (register `{ path: "/deck/:chartNo", element: <Deck /> }`)
- Modify: `mtb-platform/src/pages/Report.tsx` (header button `▷ Present case` → `navigate(\`/deck/\${patient.chartNo}\`)`)
- Modify: `mtb-platform/src/pajamas.css` (append `.gl-deck*` + `@media print` rules)

**Spec (Deck.tsx):**
- Load report via `loadReport(chartNo)` (from `src/lib/data.ts`), build slides with `buildSlides` (Task 3).
- State `idx` (current slide). Full-viewport container. Render current slide by `kind` (title uses `<Redacted>` for patient name).
- Keyboard: `ArrowRight`/`Space`→next, `ArrowLeft`→prev, `f`→`requestFullscreen`, `p`→`window.print()`. Clean up listener on unmount.
- Footer: slide counter `idx+1 / n`, prev/next buttons, a `Print / PDF` button, and a `← Back` to `/report/:chartNo`.
- Evidence/recommendation slides show `slide.narration` when present plus a **✦ Draft narration** button (wired in Task 10).
- Print CSS: `@media print` → hide chrome (footer/back), each `.gl-slide` `break-after: page`, show all slides stacked (not just current) so PDF has every slide.

**Verify:** `pnpm dev` → from a report click **Present case**; arrow keys page through 6 slides; patient name blurred until clicked; `p` opens print dialog with one slide per page. `pnpm build` + oxlint clean.

**Commit:** `feat: case-presentation Deck page with keyboard nav and print`.

---

### Task 10: `functions/api/narrate.ts` + wire Draft narration

**Files:**
- Create: `mtb-platform/functions/api/narrate.ts` (mirror `summary.ts`)
- Modify: `mtb-platform/src/pages/Deck.tsx` (call it from **✦ Draft narration**)

**Spec (narrate.ts):** Body `{ patient:{cancerType,stage}, biomarkers, findings:[{gene,alteration,escat,drugs}], priorTherapy }` (reuse `AiSummary`'s body-building shape). System prompt: *"You are an MTB scribe. Produce (1) a 2–3 sentence assessment and (2) 2–4 board recommendations / open questions. Cite ESCAT tiers and drugs. ≤160 words. Plain text, no headers."* Return `{ narration }`. 503 when key unset.

**Deck wiring:** **✦ Draft narration** POSTs to `${import.meta.env.BASE_URL}api/narrate`; on success set `narration` into evidence + recommendation slides; `idle|loading|unconfigured|error` like `AiSummary`.

**Verify:** `pnpm build` + oxlint clean; offline → button shows unconfigured hint.

**Commit:** `feat: /api/narrate + Draft narration in the deck`.

---

### Task 11: Full verification pass

**Steps:**
1. `pnpm test` → all pure-lib tests pass.
2. `pnpm build` → tsc + vite succeed, no type errors.
3. `./node_modules/.bin/oxlint` → no new errors vs baseline (pre-existing warnings only).
4. `pnpm dev` manual sweep:
   - Report → Literature: every variant has a KnowledgeCard; actionable = real PRISMA/GRADE; others derived; **Cite (AMA)** copies correctly; **Export AMA references** copies a numbered list; **mybib ↗** opens the AMA generator.
   - **Run robust-lit-review** shows the unconfigured hint with no key (or live text if a key is set).
   - Report → **Present case** → deck pages via keyboard; name blurred until click; **Print / PDF** produces a clean multi-page PDF; **Draft narration** degrades gracefully.
5. Use the **superpowers:verification-before-completion** skill to confirm evidence before claiming done.

**Commit (if any fixups):** `chore: verification fixups`.

---

## After implementation

Use **superpowers:finishing-a-development-branch**: open a PR from `feature/litreview-pico-deck` → `main`, merge after review, then redeploy (Cloudflare Pages picks up `main`; ensure `ANTHROPIC_API_KEY` Pages secret is set for live synthesis).

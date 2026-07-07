# MTB Platform

A Molecular Tumor Board review platform. It turns the **real output of the
`ngs-tertiary-analysis-skills` pipeline** into a per-patient molecular report,
in a single TypeScript interface styled with GitLab's
[Pajamas design system](https://design.gitlab.com/).

## Data sources

| Source                             | Role                                       | What flows into the platform                                     |
| ---------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| **ngs-tertiary-analysis-skills**   | BAM/VCF → OncoKB annotation, ESCAT tiering | variants, treatments, TMB/MSI/HRD, CNV, fusions, PubMed hits — **real** |
| **consult** (KFSYSCC) schema       | hospital EMR / consult shape               | drives the mocked patient identity / clinical context            |

The molecular content is the **genuine analysis result** read directly from each
sample's pipeline artifacts. Patient identity (name, chart no, demographics,
team) is **mocked per sample and PHI-free** — the pipeline's `reports/` directory
of real patient data never enters this repo.

### What is read from the real pipeline

Per sample, `scripts/build-data.mjs` reads:

- `06-clinical-annotation/escat_tiers.csv` — ESCAT tiers (master alteration list)
- `06-clinical-annotation/oncokb_results.json` — oncogenicity, mutation effect, matched treatments (drug, level, FDA status, description)
- `05-biomarkers/{tmb,msi,hrd}_result.json` — biomarkers with sub-scores (LOH/TAI/LST)
- `03-cnv/cnvkit_segments.tsv` · `04-fusions/fusions.tsv` — copy number & fusions
- `07-literature/pubmed_hits.json` — real PubMed retrieval
- `07-literature/narratives.json` — curated per-variant narratives

Variants of unknown significance (Tier X, non-oncogenic) are filtered so the
report shows only clinically meaningful alterations.

## Architecture

Static SPA (Vite + React + TS + `@primer/react`), no backend. The pipeline is
untouched; the platform consumes its output contract, locked behind TS types
(`src/types/`).

```
ngs pipeline reports/ → scripts/build-data.mjs → public/data/*.json → React SPA (Primer)
```

- **Worklist `/`** — shared multi-team inbox (Primer `DataTable`): diagnosis,
  actionable-finding count, top genes, status.
- **Report `/report/:chartNo`** — five sections via `UnderlineNav`:
  1. **Overview** — key Tier I–II findings, matched therapies, biomarker signal, clinical context
  2. **Variants** — ESCAT-ranked alterations; expand for the curated narrative + OncoKB treatments
  3. **Biomarkers** — TMB/MSI/HRD with sub-scores, CNV table, gene fusions
  4. **Therapies** — every OncoKB-matched treatment, ranked by evidence level, with FDA badge
  5. **Literature** — real PubMed records grouped by gene, linked by PMID

### Design system

GitLab **Pajamas**, light theme. Design tokens (colour scale, typography,
spacing, radii) are hand-authored in `src/pajamas.css` from the documented
Pajamas values, so the app carries no Vue / `@gitlab/ui` dependency. Thin
React primitives live in `src/components/gl.tsx` (`GlCard`, `GlBadge`,
`GlCount`, tabs, table, inline icons).

Colour is reserved for a **single clinical signal** — ESCAT actionability tier
(I → success, II → info, III → warning, IV/X → neutral) — plus report status,
positive biomarkers, and FDA-approved therapies. Everything else stays neutral.

## Development

```bash
pnpm install
pnpm data      # regenerate public/data/*.json from the NGS pipeline output
pnpm dev       # dev server
pnpm build     # tsc + vite production build (static; deployable to Pages / Netlify)
```

`pnpm data` reads the pipeline output from `$NGS_REPORTS`
(default `/Users/htlin/ngs-tertiary-analysis-skills/reports`). The generated
`public/data/*.json` is PHI-free and committed, so the app runs offline.

Stack: Vite 8 · React 18 · GitLab Pajamas tokens (no UI framework dependency) ·
react-router-dom (HashRouter, no server rewrite).

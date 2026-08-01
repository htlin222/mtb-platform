# Development Process — MTB Platform Wiki

> How we actually build on this repo, reconstructed from what we've shipped so far.
> This is a living page: update it when the workflow changes, not just when features change.

---

## 1. What we're building

An agentic **Molecular Tumor Board (MTB)** platform: it takes patient molecular
findings (VCF → annotated variants) and turns them into board-ready, appraised,
cited knowledge — with a live case-presentation deck for use in the actual tumor
board meeting.

All source lives under [`mtb-platform/`](../mtb-platform). The repo root holds the
hackathon narrative docs (`01-…` through `07-…`) and this wiki under `docs/`.

**Stack**

| Layer | Choice |
|---|---|
| Frontend | React 18 + React Router 7, Vite 8, TypeScript |
| Gen AI backend | Cloudflare Pages **Functions** (`functions/api/*`), all Anthropic-backed |
| Viz | Chart.js, IGV.js, custom lollipop/oncoprint SVG |
| Tests | Vitest (pure-function libs) |
| Lint | oxlint |
| Deploy | Cloudflare Pages via `wrangler`, run manually from the local machine |

---

## 2. The core loop: Design → Plan → TDD → Ship

Every non-trivial feature has followed the same three-phase rhythm. The clearest
worked example is the litreview/PICO/deck feature set — both artifacts are checked
into the repo:

- **Design doc** — [`docs/plans/2026-07-07-litreview-pico-deck-design.md`](plans/2026-07-07-litreview-pico-deck-design.md)
  Starts from a brainstorm, ends with a **"Decisions (locked)"** table. Nothing
  gets built until the ambiguous choices (backend, placement, citation style,
  privacy defaults) are pinned down.
- **Implementation plan** — [`docs/plans/2026-07-07-litreview-pico-deck-implementation.md`](plans/2026-07-07-litreview-pico-deck-implementation.md)
  Decomposes the design into ordered, single-commit steps. Each step is written
  as an explicit **TDD cycle**: *write failing test → run `pnpm test` (FAIL) →
  implement → run `pnpm test` (PASS) → commit*.
- **Implementation** — one commit per plan step, message matching the plan
  (e.g. `feat: derive per-variant PICO + GRADE knowledge`).

### TDD is real here, not aspirational

Pure logic lives in `src/lib/*.ts` and is covered by co-located `*.test.ts`:

```
src/lib/citation.ts        ← citation.test.ts
src/lib/pico.ts            ← pico.test.ts
src/lib/deck.ts            ← deck.test.ts
src/lib/mutationMapper.ts  ← mutationMapper.test.ts
src/lib/notes.ts           ← notes.test.ts
src/lib/audit.ts           ← audit.test.ts
functions/api/litreview.ts ← litreview.test.ts
```

The rule that emerges: **anything deterministic goes in a `lib` module with a
test; React components and Pages Functions stay thin and orchestrate those
libs.** That's why the components are wiring (`LiteratureTab.tsx` renders
`KnowledgeCard`s built from `knowledge.ts`) rather than logic.

---

## 3. Branching & isolation

- Trunk is **`main`**; everything ships through it.
- Feature work happens on isolated branches / **git worktrees**
  (`.worktrees/` is gitignored). Surviving feature branches:
  `feat/clinician-notes`, `feat/agent-audit-trail`, `oss-export`.
- Larger features land as a `feat:` commit followed by a `merge:` commit
  (e.g. *anchored clinician notes*, *agent audit trail*) — the worktree is
  developed, then merged back into `main`.

Commit style is **conventional-ish**: `feat:` (14), `docs:` (4), `test:`,
`fix:`, `ci:`, plus a `merge:` for worktree integrations. Early scaffolding
commits used plain `Add …` messages; conventional prefixes took over once the
plan-driven loop started.

---

## 4. Quality gates

Ordered the way CI runs them — a change isn't "done" until all pass:

1. **Types** — `tsc -b` (part of `pnpm build`)
2. **Lint** — `pnpm lint` (oxlint)
3. **Tests** — `pnpm test` (`vitest run`)
4. **Citations** — `pnpm check:citations` (`scripts/check-citations.mjs`)
   guards against unverifiable / fabricated references — a domain-specific gate
   that matters because this is a medical tool.
5. **Build** — `pnpm build`

`AGENTS`/Gen-AI endpoints follow a **graceful-degradation** contract: every
Anthropic-backed Function has a curated/offline fallback so the demo never hard-
fails when a key or network is missing (pattern established by
`functions/api/summary.ts`).

---

## 5. Deploy

**The platform is live: https://mtb-platform.pages.dev** (Cloudflare Pages,
project `mtb-platform`). The `ANTHROPIC_API_KEY` secret is set on the Pages
project, so the Gen-AI Functions run live — not in offline-fallback mode.

### How we actually deploy — manual `wrangler` from the local machine

This is the working path today. Local `wrangler` is OAuth-logged-in and its
token has `pages (write)`, so no CI secrets are needed:

```bash
cd mtb-platform
pnpm install --frozen-lockfile
pnpm build
wrangler pages deploy dist --project-name=mtb-platform --branch=main --commit-dirty=true
```

`wrangler pages deploy` auto-detects the adjacent `functions/` dir and compiles
the Functions bundle alongside the static `dist/`. Deploy takes seconds.

### No CI deploy (removed on purpose)

There used to be a `.github/workflows/deploy.yml` that ran `checkout → install →
test → build → wrangler-action pages deploy` on every push to `main`. Its tests
and build passed, but the deploy step always failed — the repo secrets
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` were never set, so `wrangler`
aborted with *"In a non-interactive environment, it's necessary to set a
CLOUDFLARE_API_TOKEN environment variable"*.

Since manual `wrangler` already ships the site, the workflow was deleted rather
than fed a credential: this repo is public, and a Cloudflare API token in its
Actions secrets is a bigger exposure than the CI convenience is worth. To bring
CI deploy back, restore the file from git history and set those two repo secrets
(the token needs `Cloudflare Pages: Edit` on the account owning the
`mtb-platform` project).

Note that removing it also removed the automated `pnpm test` / `pnpm build` gate
on push — run both locally before deploying.

**One-off setup already done (don't redo):** the `mtb-platform` Pages project
exists and its `ANTHROPIC_API_KEY` production secret is set
(`wrangler pages secret put ANTHROPIC_API_KEY --project-name=mtb-platform`).

### Local dev

```bash
cd mtb-platform
pnpm install
pnpm dev            # Vite dev server
pnpm test           # watch/run Vitest
pnpm data           # rebuild fixtures via scripts/build-data.mjs
```

Secrets for local Functions go in `.dev.vars` (see `.dev.vars.example` /
`.env.example`). `pnpm secret` (`scripts/push-secret.sh`) pushes the Anthropic
key to the Cloudflare Pages project.

---

## 6. Repo map (orientation)

```
mtb-platform/
├── functions/api/      Anthropic-backed Pages Functions (summary, litreview, narrate)
├── src/
│   ├── lib/            pure logic + co-located tests  ← the tested core
│   ├── components/     thin React wiring (tabs, cards, plots, drawers)
│   ├── pages/          routes (Report, Deck, Board, Cohort, Upload, Landing…)
│   └── types/
├── scripts/            build-data, check-citations, push-secret
└── public/
docs/plans/             design + implementation docs (the paper trail)
```

---

## 7. Conventions cheat-sheet

- **New feature?** Write a design doc → lock the decisions table → write an
  implementation plan with per-step TDD cycles → build one commit per step.
- **New logic?** Put it in `src/lib/`, write the failing test first.
- **New Gen-AI call?** New `functions/api/*.ts`, Anthropic-backed, with an
  offline fallback. Add a `*.test.ts`.
- **Touching references/citations?** Run `pnpm check:citations`.
- **Isolation for risky work?** Branch or worktree under `.worktrees/`,
  merge back to `main` with a `merge:` commit.
- **Commit messages:** conventional prefixes (`feat:`/`fix:`/`docs:`/`test:`/`ci:`).

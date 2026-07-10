# Audit trail — design

**Date:** 2026-07-10
**Goal:** Make every step of every process inspectable after the fact, so a reviewer
can see *which operation did what* and *who produced each result* — an anti-hallucination
provenance log. Directly serves the "responsible deployment / reward skepticism" story the
hackathon judges (Anthropic + Gladstone) care about.

## Decisions (from brainstorming)

- **Scope:** every meaningful operation, each tagged with a **trust class**.
- **Surface:** a single global slide-out drawer, reachable from any page, exportable.
- **Persistence:** `localStorage` (capped ring buffer) + JSON export.

## Trust classes

| class           | meaning                               | carries      |
| --------------- | ------------------------------------- | ------------ |
| `deterministic` | pure client-side computation          | fingerprint  |
| `model`         | a Claude call                         | `model` id   |
| `external-api`  | a third-party fetch                   | `source`     |
| `human`         | a clinician action                    | —            |

Each `AuditEvent`: `{ id, ts, trust, op, summary, detail?, model?, source?, patient?, fingerprint? }`.
The fingerprint is a non-cryptographic FNV-1a hash of the salient in/out — it shows "same
input → same output" without storing PHI. It is explicitly **not** a security control.

## Architecture

- `src/lib/audit.ts` — a tiny observable store: `logAudit`, `getAuditEvents`,
  `subscribeAudit`, `clearAudit`, `exportAuditJson`, `fingerprint`. Backed by
  `localStorage` with an in-memory fallback (SSR / private-mode safe); capped at 500
  events (ring buffer). `getAuditEvents` returns a stable reference until mutation so it
  drives `useSyncExternalStore` without tearing.
- `src/components/AuditDrawer.tsx` — mounted **once** at the app root in `main.tsx`,
  beside `<RouterProvider>`, so it survives route changes and needs no prop threading.
  Floating toggle (with live count) → slide-out drawer: reverse-chronological rows, trust
  filter chips, Export JSON, Clear.

## Instrumentation points

| op                  | trust          | site                    |
| ------------------- | -------------- | ----------------------- |
| `vcf.parse`         | deterministic  | `Upload.tsx`            |
| `livereport.build`  | deterministic  | `Upload.tsx`            |
| `pipeline.run`      | human          | `Upload.tsx`            |
| `pipeline.<stage>`  | deterministic  | `Process.tsx`           |
| `pipeline.complete` | deterministic  | `Process.tsx`           |
| `agent.retrieve`    | external-api   | `KnowledgeCard.tsx`     |
| `agent.appraise`    | model          | `KnowledgeCard.tsx`     |
| `agent.verify`      | external-api   | `KnowledgeCard.tsx`     |
| `agent.revise`      | model          | `KnowledgeCard.tsx`     |
| `agent.complete` / `agent.refusal` | model | `KnowledgeCard.tsx` |
| `ai.summary` / `ai.summary.refusal` | model | `AiSummary.tsx`   |
| `deck.narrate` / `deck.narrate.refusal` | model | `Deck.tsx`    |
| `board.decision`    | human          | `Board.tsx`             |

The litreview Function now emits its `model` id in the appraise/revise/final stream
events so the client logs the exact model, not a guess.

## Data flow

operation → `logAudit(...)` → store appends + persists + notifies → drawer re-renders via
`useSyncExternalStore`.

## Testing

- `src/lib/audit.test.ts` — append/order, snapshot-reference change, ring-buffer cap,
  subscribe/unsubscribe, JSON export round-trip, fingerprint determinism.
- Browser (Playwright) — toggle present; sample-VCF parse logs `vcf.parse`; drawer shows
  the row; trust chips render; Export enabled; running the pipeline logs the stage +
  `pipeline.complete` events; count accumulates.

## Known behaviour

The drawer is global, so it stays open across route changes; its backdrop intercepts page
clicks until dismissed (click backdrop / Close). This is intended — it's one log for the
whole session, not per-page.

# Clinician notes — design

**Date:** 2026-07-10
**Goal:** Let the user annotate the case. Grilled hard first (see below) so it fits a
provenance platform instead of becoming a disconnected sticky-note pad.

## The grill → decisions

- **Biggest trap avoided:** a free-floating notepad = a second memory system next to the
  audit trail, with no context. So **notes anchor to a specific object** (variant /
  citation / therapy / report section), scoped per patient.
- **Surface:** inline "Notes (N)" affordance beside the anchored object **plus** a
  per-report **Notes tab** that aggregates every note for the case.
- **Provenance / lifecycle:** notes are editable + deletable, timestamped, **export with
  the case** (JSON), and every add/edit/delete emits a `human` audit event — so notes
  *reinforce* the audit story rather than dilute it.

## Data model (`src/lib/notes.ts`)

```
Note   { id, ts, updatedTs?, patient(chartNo), anchor, text }
anchor { kind: "variant"|"citation"|"therapy"|"section", ref: stableKey, label: display }
```

Store mirrors `audit.ts`: observable (`subscribeNotes`/`getNotes` for
useSyncExternalStore), `localStorage` (`mtb.notes.v1`, cap 1000, in-memory fallback).
API: `addNote` / `editNote` / `deleteNote` (each logs a `human` audit event via
`logAudit`), `notesFor(patient)`, `notesForAnchor(patient, ref)`, `exportNotesJson(patient)`.
Empty / unchanged text is a no-op.

## Components

- `NoteThread` (`src/components/NoteThread.tsx`) — reusable. Given `{patient, anchor}`,
  renders a "Notes (N)" toggle → thread (each note editable / deletable, timestamped) +
  composer (⌘/Ctrl+Enter to save). Reads live via useSyncExternalStore.
- `NotesTab` (`src/components/NotesTab.tsx`) — per-report aggregator: a General composer
  (section anchor) + one group per anchored object that has notes, each a `NoteThread`;
  Export-notes-JSON button.

## Anchor points wired

- Variant evidence card — `KnowledgeCard.tsx` (anchor `variant`, ref `GENE ALT`). Needed
  a new `patient` prop, passed from `LiteratureTab`.
- Therapy rows — `TherapiesTab.tsx` (anchor `therapy`).
- Report **Notes** tab — `Report.tsx` (new TabKey + count badge + render).

## Testing

- `src/lib/notes.test.ts` — add (trim + empty no-op), per-patient scoping, edit
  (updatedTs, unchanged/empty no-op), delete, **audit event emitted for each**, subscribe,
  scoped JSON export. (44 unit tests total pass.)
- Browser (Playwright) — open Notes tab, add a note (count → 1), audit drawer shows
  `note.add`, note persists across reload, edit, delete (count → 0). All pass.

## Note

The audit drawer is mounted at root and always in the DOM (off-screen when closed), so a
note's text also appears once in its audit-trail entry — expected, and evidence the
provenance link works.

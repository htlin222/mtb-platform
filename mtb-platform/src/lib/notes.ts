// ---------------------------------------------------------------------------
// Clinician notes — editable annotations ANCHORED to a specific object (a
// variant, a citation, a therapy, or a report section), scoped per patient.
//
// Distinct from the audit trail (append-only, system-written) and board votes
// (structured decisions): notes are hand-written, editable, and contextual. But
// every note create/edit/delete emits a `human` audit event, so the annotation
// activity is itself on the record — notes reinforce provenance, not dilute it.
//
// Same observable + localStorage pattern as audit.ts, so a NoteThread can read
// live via useSyncExternalStore with no prop threading.
// ---------------------------------------------------------------------------

import { logAudit } from "./audit";

export type NoteAnchorKind = "variant" | "citation" | "therapy" | "section";

export interface NoteAnchor {
  kind: NoteAnchorKind;
  ref: string;    // stable key, e.g. "BRAF V600E", "PMID:25399551", "section:report"
  label: string;  // human display, e.g. "BRAF V600E", "PMID 25399551", "General"
}

export interface Note {
  id: string;
  ts: number;
  updatedTs?: number;
  patient: string;   // chartNo — scopes the note to a case
  anchor: NoteAnchor;
  text: string;
}

const KEY = "mtb.notes.v1";
const CAP = 1000;

const hasLS = (() => {
  try { return typeof localStorage !== "undefined"; } catch { return false; }
})();

function load(): Note[] {
  if (!hasLS) return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch { return []; }
}

let notes: Note[] = load();
let seq = 0;
const listeners = new Set<() => void>();

function persist() {
  if (!hasLS) return;
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* quota / private mode */ }
}

function emit() {
  for (const l of listeners) l();
}

function commit(next: Note[]) {
  notes = next.length > CAP ? next.slice(next.length - CAP) : next;
  persist();
  emit();
}

const snippet = (t: string) => (t.length > 60 ? t.slice(0, 60) + "…" : t);

export function addNote(input: { patient: string; anchor: NoteAnchor; text: string }): Note | null {
  const text = input.text.trim();
  if (!text) return null;
  const ts = Date.now();
  const note: Note = { id: `${ts}-${seq++}`, ts, patient: input.patient, anchor: input.anchor, text };
  commit([...notes, note]);
  logAudit({
    trust: "human", op: "note.add",
    summary: `Note on ${input.anchor.label}: "${snippet(text)}"`,
    detail: { anchor: input.anchor.ref }, patient: input.patient,
  });
  return note;
}

export function editNote(id: string, text: string): void {
  const trimmed = text.trim();
  const existing = notes.find((n) => n.id === id);
  if (!existing || !trimmed || trimmed === existing.text) return;
  commit(notes.map((n) => (n.id === id ? { ...n, text: trimmed, updatedTs: Date.now() } : n)));
  logAudit({
    trust: "human", op: "note.edit",
    summary: `Edited note on ${existing.anchor.label}: "${snippet(trimmed)}"`,
    detail: { anchor: existing.anchor.ref }, patient: existing.patient,
  });
}

export function deleteNote(id: string): void {
  const existing = notes.find((n) => n.id === id);
  if (!existing) return;
  commit(notes.filter((n) => n.id !== id));
  logAudit({
    trust: "human", op: "note.delete",
    summary: `Deleted note on ${existing.anchor.label}`,
    detail: { anchor: existing.anchor.ref }, patient: existing.patient,
  });
}

export function getNotes(): Note[] {
  return notes;
}

export function subscribeNotes(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notesFor(patient: string): Note[] {
  return notes.filter((n) => n.patient === patient);
}

export function notesForAnchor(patient: string, ref: string): Note[] {
  return notes.filter((n) => n.patient === patient && n.anchor.ref === ref);
}

export function exportNotesJson(patient: string): string {
  const scoped = notesFor(patient);
  return JSON.stringify(
    { tool: "mtb-platform", kind: "case-notes", patient, exportedAt: Date.now(), count: scoped.length, notes: scoped },
    null,
    2,
  );
}

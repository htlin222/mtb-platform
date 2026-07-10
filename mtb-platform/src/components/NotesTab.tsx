import { useSyncExternalStore } from "react";
import type { Report } from "../types";
import {
  subscribeNotes, getNotes, notesFor, exportNotesJson,
  type Note, type NoteAnchor, type NoteAnchorKind,
} from "../lib/notes";
import NoteThread from "./NoteThread";
import { GlCard, GlBadge } from "./gl";
import type { BadgeVariant } from "./gl";

// Per-report aggregator: every note for this patient, grouped by anchor, plus a
// general composer and a JSON export. Reuses NoteThread for each group so add /
// edit / delete work here exactly as they do inline on the source object.

const GENERAL: NoteAnchor = { kind: "section", ref: "section:report", label: "General" };

const KIND_META: Record<NoteAnchorKind, { label: string; variant: BadgeVariant }> = {
  variant: { label: "variant", variant: "info" },
  citation: { label: "citation", variant: "neutral" },
  therapy: { label: "therapy", variant: "success" },
  section: { label: "general", variant: "muted" },
};

export default function NotesTab({ report }: { report: Report }) {
  useSyncExternalStore(subscribeNotes, getNotes, getNotes);
  const patient = report.patient.chartNo;
  const notes = notesFor(patient);

  // Distinct anchored groups (everything except the general section), newest first.
  const groups = new Map<string, { anchor: NoteAnchor; notes: Note[] }>();
  for (const n of notes) {
    if (n.anchor.ref === GENERAL.ref) continue;
    const g = groups.get(n.anchor.ref) ?? { anchor: n.anchor, notes: [] };
    g.notes.push(n);
    groups.set(n.anchor.ref, g);
  }
  const grouped = [...groups.values()].sort(
    (a, b) => Math.max(...b.notes.map((n) => n.ts)) - Math.max(...a.notes.map((n) => n.ts)),
  );

  const doExport = () => {
    const blob = new Blob([exportNotesJson(patient)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtb-notes-${patient}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gl-col">
      <div className="gl-row gl-center gl-between" style={{ marginBottom: 2 }}>
        <div className="gl-section-title" style={{ margin: 0 }}>Case notes · {notes.length}</div>
        <button className="gl-button" onClick={doExport} disabled={!notes.length}>⭳ Export notes (JSON)</button>
      </div>
      <p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 6px" }}>
        Notes are anchored to what you were looking at, logged to the audit trail as human
        actions, and export with the case. Add a general one here, or annotate a variant /
        therapy where you see it.
      </p>

      {/* General note */}
      <GlCard header="General note">
        <NoteThread patient={patient} anchor={GENERAL} defaultOpen />
      </GlCard>

      {/* Anchored groups */}
      {grouped.length === 0 ? (
        <p className="gl-text-sm gl-text-muted" style={{ margin: "6px 2px" }}>
          No anchored notes yet. Open the Literature or Therapies tab and use “Notes” on a
          specific alteration or drug.
        </p>
      ) : (
        grouped.map((g) => (
          <GlCard
            key={g.anchor.ref}
            header={
              <div className="gl-row gl-center" style={{ gap: 8 }}>
                <GlBadge variant={KIND_META[g.anchor.kind].variant}>{KIND_META[g.anchor.kind].label}</GlBadge>
                <span className="mono gl-strong">{g.anchor.label}</span>
                <span className="gl-text-xs gl-text-muted">· {g.notes.length}</span>
              </div>
            }
          >
            <NoteThread patient={patient} anchor={g.anchor} defaultOpen />
          </GlCard>
        ))
      )}
    </div>
  );
}

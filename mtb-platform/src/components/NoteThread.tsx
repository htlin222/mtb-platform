import { useState, useSyncExternalStore } from "react";
import {
  subscribeNotes, getNotes, notesForAnchor, addNote, editNote, deleteNote,
  type Note, type NoteAnchor,
} from "../lib/notes";
import { CommentIcon } from "./gl";

// Reusable, anchored note affordance. Drop it beside any annotatable object with
// a stable anchor; it shows a "Notes (N)" toggle and, when open, the thread for
// that anchor plus a composer. Reads live from the notes store via
// useSyncExternalStore — no props beyond the anchor identity.

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function NoteThread({
  patient, anchor, defaultOpen,
}: {
  patient: string;
  anchor: NoteAnchor;
  defaultOpen?: boolean;
}) {
  useSyncExternalStore(subscribeNotes, getNotes, getNotes);
  const notes = notesForAnchor(patient, anchor.ref);
  const [open, setOpen] = useState(!!defaultOpen);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    addNote({ patient, anchor, text: draft });
    setDraft("");
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="gl-link-button"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <CommentIcon size={12} /> Notes{notes.length ? ` (${notes.length})` : ""}
      </button>

      {open && (
        <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg-subtle, rgba(0,0,0,0.02))", borderRadius: 6, border: "1px solid var(--border)" }}>
          {notes.length > 0 && (
            <div className="gl-col" style={{ gap: 8, marginBottom: 10 }}>
              {notes.map((n) => <NoteRow key={n.id} note={n} />)}
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder={`Add a note on ${anchor.label}…`}
            rows={2}
            className="gl-input"
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13, padding: 8, boxSizing: "border-box" }}
          />
          <div className="gl-row gl-center gl-between" style={{ marginTop: 6 }}>
            <span className="gl-text-xs gl-text-muted">⌘/Ctrl+Enter to save</span>
            <button type="button" className="gl-button gl-button-confirm" onClick={submit} disabled={!draft.trim()}
              style={!draft.trim() ? { opacity: 0.5 } : undefined}>
              Add note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteRow({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);

  if (editing) {
    return (
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="gl-input"
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13, padding: 8, boxSizing: "border-box" }}
        />
        <div className="gl-row" style={{ gap: 8, marginTop: 4 }}>
          <button type="button" className="gl-button gl-button-confirm" onClick={() => { editNote(note.id, text); setEditing(false); }}>Save</button>
          <button type="button" className="gl-link-button" onClick={() => { setText(note.text); setEditing(false); }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
      <div className="gl-text-sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.text}</div>
      <div className="gl-row gl-center" style={{ gap: 8, marginTop: 2 }}>
        <span className="gl-text-xs gl-text-muted">
          {fmt(note.ts)}{note.updatedTs ? ` · edited ${fmt(note.updatedTs)}` : ""}
        </span>
        <button type="button" className="gl-link-button gl-text-xs" onClick={() => setEditing(true)}>edit</button>
        <button type="button" className="gl-link-button gl-text-xs" onClick={() => deleteNote(note.id)} style={{ color: "var(--red-700)" }}>delete</button>
      </div>
    </div>
  );
}

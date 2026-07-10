import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addNote, editNote, deleteNote, getNotes, notesFor, notesForAnchor,
  subscribeNotes, exportNotesJson, type NoteAnchor,
} from "./notes";
import { clearAudit, getAuditEvents } from "./audit";

const V: NoteAnchor = { kind: "variant", ref: "BRAF V600E", label: "BRAF V600E" };
const T: NoteAnchor = { kind: "therapy", ref: "therapy:dabrafenib:BRAF", label: "dabrafenib · BRAF V600E" };

// Reset both stores between tests (notes has no clear(); delete everything).
beforeEach(() => {
  for (const n of [...getNotes()]) deleteNote(n.id);
  clearAudit();
});

describe("notes store", () => {
  it("adds a note scoped to patient + anchor and ignores empty text", () => {
    expect(addNote({ patient: "P1", anchor: V, text: "   " })).toBeNull();
    const n = addNote({ patient: "P1", anchor: V, text: "  confirm G6PD  " });
    expect(n).not.toBeNull();
    expect(n!.text).toBe("confirm G6PD");        // trimmed
    expect(notesFor("P1")).toHaveLength(1);
    expect(notesForAnchor("P1", "BRAF V600E")).toHaveLength(1);
    expect(notesForAnchor("P1", "other")).toHaveLength(0);
  });

  it("scopes notes per patient", () => {
    addNote({ patient: "P1", anchor: V, text: "a" });
    addNote({ patient: "P2", anchor: V, text: "b" });
    expect(notesFor("P1")).toHaveLength(1);
    expect(notesFor("P2")).toHaveLength(1);
  });

  it("edits a note (sets updatedTs) and no-ops on unchanged/empty text", () => {
    const n = addNote({ patient: "P1", anchor: V, text: "first" })!;
    editNote(n.id, "first");                     // unchanged → no-op
    editNote(n.id, "  ");                          // empty → no-op
    editNote(n.id, "second");
    const after = notesFor("P1")[0];
    expect(after.text).toBe("second");
    expect(after.updatedTs).toBeGreaterThanOrEqual(after.ts);
  });

  it("deletes a note", () => {
    const n = addNote({ patient: "P1", anchor: V, text: "gone soon" })!;
    deleteNote(n.id);
    expect(notesFor("P1")).toHaveLength(0);
  });

  it("emits a human audit event for add / edit / delete", () => {
    const n = addNote({ patient: "P1", anchor: V, text: "x" })!;
    editNote(n.id, "y");
    deleteNote(n.id);
    const ops = getAuditEvents().map((e) => e.op);
    expect(ops).toEqual(["note.add", "note.edit", "note.delete"]);
    expect(getAuditEvents().every((e) => e.trust === "human")).toBe(true);
  });

  it("notifies subscribers", () => {
    const cb = vi.fn();
    const off = subscribeNotes(cb);
    addNote({ patient: "P1", anchor: V, text: "z" });
    expect(cb).toHaveBeenCalled();
    off();
  });

  it("exports only the requested patient's notes as JSON", () => {
    addNote({ patient: "P1", anchor: V, text: "keep" });
    addNote({ patient: "P1", anchor: T, text: "keep2" });
    addNote({ patient: "P2", anchor: V, text: "drop" });
    const dump = JSON.parse(exportNotesJson("P1"));
    expect(dump.kind).toBe("case-notes");
    expect(dump.patient).toBe("P1");
    expect(dump.count).toBe(2);
    expect(dump.notes.every((n: { patient: string }) => n.patient === "P1")).toBe(true);
  });
});

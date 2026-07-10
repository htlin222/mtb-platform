import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAudit, getAuditEvents, subscribeAudit, clearAudit, exportAuditJson, fingerprint } from "./audit";

beforeEach(() => clearAudit());

describe("audit trail", () => {
  it("appends events in order with generated id + ts and preserved fields", () => {
    const a = logAudit({ trust: "deterministic", op: "vcf.parse", summary: "12 PASS variants" });
    const b = logAudit({ trust: "model", op: "agent.appraise", summary: "GRADE Moderate", model: "claude-haiku-4-5" });
    expect(a.id).not.toBe(b.id);
    expect(typeof a.ts).toBe("number");
    const evs = getAuditEvents();
    expect(evs.map((e) => e.op)).toEqual(["vcf.parse", "agent.appraise"]);
    expect(evs[1]).toMatchObject({ trust: "model", model: "claude-haiku-4-5" });
  });

  it("returns a new snapshot reference on each mutation (useSyncExternalStore contract)", () => {
    const before = getAuditEvents();
    logAudit({ trust: "human", op: "signoff", summary: "approved" });
    expect(getAuditEvents()).not.toBe(before);
  });

  it("caps the ring buffer and drops the oldest events", () => {
    for (let i = 0; i < 520; i++) logAudit({ trust: "deterministic", op: "tick", summary: String(i) });
    const evs = getAuditEvents();
    expect(evs.length).toBe(500);
    // Oldest 20 dropped; the window is the most recent 500.
    expect(evs[0].summary).toBe("20");
    expect(evs.at(-1)!.summary).toBe("519");
  });

  it("notifies subscribers on log and clear, and unsubscribes cleanly", () => {
    const cb = vi.fn();
    const off = subscribeAudit(cb);
    logAudit({ trust: "human", op: "x", summary: "y" });
    expect(cb).toHaveBeenCalledTimes(1);
    clearAudit();
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    logAudit({ trust: "human", op: "x", summary: "y" });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("exports parseable JSON that round-trips the events", () => {
    logAudit({ trust: "external-api", op: "pubmed.esearch", summary: "5 hits", source: "PubMed E-utilities" });
    const dump = JSON.parse(exportAuditJson());
    expect(dump.kind).toBe("audit-trail");
    expect(dump.count).toBe(1);
    expect(dump.events[0]).toMatchObject({ op: "pubmed.esearch", source: "PubMed E-utilities" });
  });

  it("fingerprints deterministically: same input → same hash, different input → different", () => {
    expect(fingerprint({ gene: "BRAF" })).toBe(fingerprint({ gene: "BRAF" }));
    expect(fingerprint("BRAF V600E")).not.toBe(fingerprint("EGFR L858R"));
    expect(fingerprint("x")).toMatch(/^[0-9a-f]{8}$/);
  });
});

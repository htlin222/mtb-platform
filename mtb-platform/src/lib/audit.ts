// ---------------------------------------------------------------------------
// Audit trail — one append-only log of every meaningful operation in the app,
// so any step of any process can be inspected after the fact. The point is
// anti-hallucination provenance: each event is tagged with a TRUST CLASS that
// says who produced it —
//
//   deterministic  — pure client-side computation (VCF parse, TMB proxy, …)
//   model          — a Claude call (records the model id)
//   external-api   — a third-party fetch (records the source, e.g. PubMed)
//   human          — a clinician action (sign-off, endorse/dissent, export)
//
// Events carry a non-cryptographic content fingerprint (FNV-1a) so a reader can
// see that the same input produced the same output, without storing PHI. The
// log lives client-side (localStorage, capped ring buffer) and exports to JSON.
// ---------------------------------------------------------------------------

export type TrustClass = "deterministic" | "model" | "external-api" | "human";

export interface AuditEvent {
  id: string;
  ts: number;
  trust: TrustClass;
  op: string;                          // short machine-ish verb, e.g. "agent.retrieve"
  summary: string;                     // one human-readable line
  detail?: Record<string, unknown>;
  model?: string;                      // set when trust === "model"
  source?: string;                     // set when trust === "external-api"
  patient?: string;                    // chartNo / sampleId context, when known
  fingerprint?: string;                // content hash of the salient in/out
}

const KEY = "mtb.audit.v1";
const CAP = 500;

// FNV-1a 32-bit — a fast, non-cryptographic content fingerprint. Used only to
// show "same input → same output", never as a security control.
export function fingerprint(input: unknown): string {
  const str = typeof input === "string" ? input : JSON.stringify(input ?? null);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const hasLS = (() => {
  try { return typeof localStorage !== "undefined"; } catch { return false; }
})();

function load(): AuditEvent[] {
  if (!hasLS) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : [];
  } catch { return []; }
}

// `events` is replaced (new reference) on every mutation so useSyncExternalStore
// sees a changed snapshot; getAuditEvents returns the cached reference otherwise.
let events: AuditEvent[] = load();
let seq = 0;
const listeners = new Set<() => void>();

function persist() {
  if (!hasLS) return;
  try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* quota / private mode — in-memory only */ }
}

function emit() {
  for (const l of listeners) l();
}

export function logAudit(input: Omit<AuditEvent, "id" | "ts"> & { ts?: number }): AuditEvent {
  const ts = input.ts ?? Date.now();
  const ev: AuditEvent = { ...input, ts, id: `${ts}-${seq++}` };
  const next = [...events, ev];
  events = next.length > CAP ? next.slice(next.length - CAP) : next;
  persist();
  emit();
  return ev;
}

export function getAuditEvents(): AuditEvent[] {
  return events;
}

export function subscribeAudit(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function clearAudit(): void {
  events = [];
  persist();
  emit();
}

export function exportAuditJson(): string {
  return JSON.stringify(
    { tool: "mtb-platform", kind: "audit-trail", exportedAt: Date.now(), count: events.length, events },
    null,
    2,
  );
}

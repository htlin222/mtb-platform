import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./litreview";

// Drive the streaming agent end-to-end with Anthropic + PubMed stubbed, so the
// appraise → verify → revise loop and its self-correction are exercised without
// network or an API key.

function req(body: unknown): Request {
  return new Request("http://x/api/litreview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readEvents(res: Response): Promise<any[]> {
  const text = await res.text();
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const BODY = {
  gene: "BRAF",
  alteration: "V600E",
  cancerType: "melanoma",
  pico: { question: "Does BRAF/MEK inhibition improve PFS in BRAF V600E melanoma?" },
  studies: [{ title: "COMBI-d", journal: "NEJM", year: "2015", pmid: "25399551" }],
};

afterEach(() => vi.restoreAllMocks());

describe("litreview streaming agent", () => {
  it("returns 503 JSON when the key is unset", async () => {
    const res = await onRequestPost({ request: req(BODY), env: {} });
    expect(res.status).toBe(503);
    expect((await res.json() as any).error).toBe("unconfigured");
  });

  it("appraises, verifies cited PMIDs, and revises when one is unverifiable", async () => {
    let anthropicCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("api.anthropic.com")) {
        anthropicCalls += 1;
        // First draft cites a good PMID (in list) AND a hallucinated one (not in list).
        // The revision drops the bad one.
        const text = anthropicCalls === 1
          ? "Moderate certainty. COMBI-d supports it (PMID 25399551). Also PMID 99999999. Confirm with the pipeline."
          : "Moderate certainty. COMBI-d supports it (PMID 25399551). Confirm with the full robust-lit-review pipeline.";
        return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text }] }), { status: 200 });
      }
      if (String(url).includes("eutils.ncbi.nlm.nih.gov")) {
        // Only the real PMID resolves; the hallucinated one has no record.
        return new Response(JSON.stringify({ result: { "25399551": { uid: "25399551" } } }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await onRequestPost({ request: req(BODY), env: { ANTHROPIC_API_KEY: "sk-test" } });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const events = await readEvents(res);
    const phases = events.map((e) => `${e.phase}:${e.status ?? ""}`);

    // Full loop fired, including the revise step.
    expect(phases).toEqual([
      "appraise:start", "appraise:done",
      "verify:start", "verify:done",
      "revise:start", "revise:done",
      "final:",
    ]);
    expect(anthropicCalls).toBe(2);

    const verify = events.find((e) => e.phase === "verify" && e.status === "done");
    const good = verify.ledger.find((e: any) => e.pmid === "25399551");
    const bad = verify.ledger.find((e: any) => e.pmid === "99999999");
    expect(good).toMatchObject({ inList: true, resolved: true });
    expect(bad).toMatchObject({ inList: false, resolved: false });

    const final = events.at(-1);
    expect(final.phase).toBe("final");
    expect(final.droppedCount).toBe(1);
    expect(final.verifiedCount).toBe(1);
    expect(final.synthesis).not.toContain("99999999");
  });

  it("skips revision when every cited PMID checks out", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("api.anthropic.com")) {
        return new Response(JSON.stringify({
          stop_reason: "end_turn",
          content: [{ type: "text", text: "High certainty. COMBI-d (PMID 25399551). Confirm with the pipeline." }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: { "25399551": { uid: "25399551" } } }), { status: 200 });
    }));

    const res = await onRequestPost({ request: req(BODY), env: { ANTHROPIC_API_KEY: "sk-test" } });
    const events = await readEvents(res);
    const phases = events.map((e) => e.phase);
    expect(phases).not.toContain("revise");
    expect(events.at(-1)).toMatchObject({ phase: "final", droppedCount: 0, verifiedCount: 1 });
  });

  it("retrieves from PubMed live when no curated studies are supplied", async () => {
    // A live judge-uploaded variant: no studies, cancerType is a placeholder.
    const liveBody = { ...BODY, cancerType: "Not specified (from VCF)", studies: [] };
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("esearch.fcgi")) {
        return new Response(JSON.stringify({ esearchresult: { idlist: ["25399551"] } }), { status: 200 });
      }
      if (u.includes("esummary.fcgi")) {
        return new Response(JSON.stringify({
          result: { "25399551": { uid: "25399551", title: "Dabrafenib + trametinib", source: "NEJM", pubdate: "2015 Jan 20", authors: [{ name: "Long GV" }, { name: "Stroyakovskiy D" }] } },
        }), { status: 200 });
      }
      if (u.includes("api.anthropic.com")) {
        return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Moderate certainty. Supported by PMID 25399551. Confirm with the pipeline." }] }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${u}`);
    }));

    const res = await onRequestPost({ request: req(liveBody), env: { ANTHROPIC_API_KEY: "sk-test" } });
    const events = await readEvents(res);
    const phases = events.map((e) => e.phase);
    expect(phases[0]).toBe("retrieve");
    // The esearch query must not include the "Not specified" placeholder.
    const esearchCall = calls.find((u) => u.includes("esearch.fcgi"))!;
    expect(decodeURIComponent(esearchCall)).toContain("BRAF V600E");
    expect(decodeURIComponent(esearchCall)).not.toMatch(/not specified/i);

    const retrieveDone = events.find((e) => e.phase === "retrieve" && e.status === "done");
    expect(retrieveDone.count).toBe(1);
    expect(retrieveDone.studies[0]).toMatchObject({ pmid: "25399551", year: "2015" });

    // The retrieved PMID feeds appraise + verify, so it lands verified in the final.
    expect(events.at(-1)).toMatchObject({ phase: "final", verifiedCount: 1, droppedCount: 0 });
  });

  it("emits a refusal final event when Claude declines", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ stop_reason: "refusal", content: [] }), { status: 200 })));
    const res = await onRequestPost({ request: req(BODY), env: { ANTHROPIC_API_KEY: "sk-test" } });
    const events = await readEvents(res);
    expect(events.at(-1)).toMatchObject({ phase: "final", refusal: true });
  });
});

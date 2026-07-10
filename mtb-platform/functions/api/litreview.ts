// Cloudflare Pages Function — POST /api/litreview  (streaming agent loop)
//
// Not a single Claude call. A visible, three-step evidence-appraisal AGENT that
// streams its own work as newline-delimited JSON (NDJSON) so the UI can render
// the loop live:
//
//   1. appraise — Claude drafts a GRADE judgement + evidence bullets, citing
//                 ONLY PMIDs from the provided study set.
//   2. verify   — every PMID Claude cited is checked LIVE against NCBI PubMed
//                 (esummary) AND against the provided allow-list. This is the
//                 same trust chip as scripts/check-citations.mjs, run inline.
//   3. revise   — if any cited PMID is unverifiable (hallucinated or dead), the
//                 failures are fed back and Claude rewrites using verified
//                 studies only. Fires only when needed; bounded to one retry.
//
// The key is a Pages secret (ANTHROPIC_API_KEY) and never reaches the browser.
// Returns 503 (JSON, non-streaming) when unset so the UI degrades gracefully.

interface Env {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

interface Study { title: string; journal: string; year: string; pmid?: string }
interface Body {
  gene: string;
  alteration: string;
  cancerType: string;
  pico: { question: string };
  studies: Study[];
}

const SYSTEM = `You are an evidence-appraisal assistant for a molecular tumor board.
Using ONLY the studies provided, give a one-line GRADE certainty judgement (High,
Moderate, Low, or Very Low), then 3-5 bullet evidence points each naming the trial or
PMID, then one caveat about confirming with the full robust-lit-review pipeline. Cite
PMIDs ONLY when they appear in the provided list — never invent a PMID or a finding not
in the list. Keep under 200 words. Plain text, no markdown headers.`;

const anthropicHeaders = (key: string) => ({
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

type ClaudeResult =
  | { kind: "text"; text: string }
  | { kind: "refusal" }
  | { kind: "error"; status: number; detail: string };

async function callClaude(env: Env, prompt: string): Promise<ClaudeResult> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders(env.ANTHROPIC_API_KEY!),
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    return { kind: "error", status: resp.status, detail: detail.slice(0, 400) };
  }
  const data = (await resp.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  // Claude may decline in a high-stakes clinical framing. A refusal returns HTTP
  // 200, so guard on stop_reason and never render the refusal text as a synthesis.
  if (data.stop_reason === "refusal") return { kind: "refusal" };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
  return { kind: "text", text };
}

// Every PMID the synthesis actually cites, e.g. "PMID 12345678" / "PMID: 123".
function citedPmids(text: string): string[] {
  const out = new Set<string>();
  const re = /PMID[:\s]+(\d{4,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

// NCBI E-utilities: one batch call confirms which PMIDs are real records. Bounded
// by a timeout — if PubMed is slow/unreachable we mark entries "unchecked" rather
// than block the demo or falsely claim verification.
async function resolvePmids(pmids: string[]): Promise<{ resolved: Set<string>; reachable: boolean }> {
  if (!pmids.length) return { resolved: new Set(), reachable: true };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const url =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" +
      pmids.join(",");
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { resolved: new Set(), reachable: false };
    const data = (await res.json()) as { result?: Record<string, { uid?: string; error?: unknown }> };
    const result = data.result || {};
    const resolved = new Set<string>();
    for (const id of pmids) {
      const rec = result[id];
      if (rec && !rec.error && rec.uid) resolved.add(id);
    }
    return { resolved, reachable: true };
  } catch {
    return { resolved: new Set(), reachable: false };
  } finally {
    clearTimeout(t);
  }
}

interface RetrievedStudy { pmid: string; title: string; journal: string; year: string; authors: string }

// Live PubMed retrieval (esearch → esummary) for the agent to reason over when
// the caller has no curated studies — i.e. a judge-uploaded VCF's variant. This
// is what makes the loop run on the judge's own data, not just the seeded cases.
async function retrievePubmed(query: string): Promise<{ studies: RetrievedStudy[]; reachable: boolean }> {
  if (!query.trim()) return { studies: [], reachable: true };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const esearch =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=" +
      encodeURIComponent(query);
    const sres = await fetch(esearch, { signal: ctrl.signal });
    if (!sres.ok) return { studies: [], reachable: false };
    const sdata = (await sres.json()) as { esearchresult?: { idlist?: string[] } };
    const ids = sdata?.esearchresult?.idlist ?? [];
    if (!ids.length) return { studies: [], reachable: true };
    const esum =
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" +
      ids.join(",");
    const ures = await fetch(esum, { signal: ctrl.signal });
    if (!ures.ok) return { studies: [], reachable: false };
    const udata = (await ures.json()) as {
      result?: Record<string, { title?: string; source?: string; fulljournalname?: string; pubdate?: string; authors?: { name: string }[] }>;
    };
    const result = udata.result || {};
    const studies = ids
      .map((id) => {
        const r = result[id] || {};
        const authors = Array.isArray(r.authors) && r.authors.length
          ? r.authors[0].name + (r.authors.length > 1 ? " et al" : "")
          : "—";
        const year = String(r.pubdate || "").split(/[ /]/)[0] || "";
        return { pmid: id, title: r.title || "", journal: r.fulljournalname || r.source || "", year, authors };
      })
      .filter((s) => s.title);
    return { studies, reachable: true };
  } catch {
    return { studies: [], reachable: false };
  } finally {
    clearTimeout(t);
  }
}

// Drop non-informative cancer-type placeholders from the live-report path so the
// PubMed query stays on gene + alteration rather than matching "not specified".
function realCancerType(ct: string): string {
  const t = (ct || "").trim();
  if (!t || t === "—" || /^not specified/i.test(t)) return "";
  return t;
}

interface LedgerEntry { pmid: string; inList: boolean; resolved: boolean; checked: boolean }

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "unconfigured", hint: "Set the ANTHROPIC_API_KEY Pages secret to enable evidence synthesis." },
      { status: 503 },
    );
  }
  let body: Body;
  try { body = (await request.json()) as Body; } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }

  const providedStudies: Study[] = body.studies ?? [];
  const model = env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      // ── Step 0: retrieve (only when no curated studies were supplied) ──────
      // The pre-baked cases pass their appraised studies and skip this; a live
      // judge-uploaded variant arrives with none, so the agent fetches its own
      // evidence from PubMed before reasoning — a genuine retrieve-then-appraise.
      let studies = providedStudies;
      if (!providedStudies.some((s) => s.pmid)) {
        const query = [body.gene, body.alteration, realCancerType(body.cancerType)].filter(Boolean).join(" ");
        emit({ phase: "retrieve", status: "start", query });
        const { studies: fetched, reachable } = await retrievePubmed(query);
        studies = fetched;
        emit({ phase: "retrieve", status: "done", count: fetched.length, reachable, studies: fetched });
      }

      const allow = new Set(studies.map((s) => s.pmid).filter(Boolean) as string[]);
      const studiesText = studies
        .map((s) => `- ${s.title} (${s.journal}, ${s.year}${s.pmid ? `; PMID ${s.pmid}` : ""})`)
        .join("\n");
      const basePrompt = [
        `Alteration: ${body.gene} ${body.alteration} in ${body.cancerType}.`,
        `PICO question: ${body.pico?.question ?? ""}`,
        `Retrieved studies:\n${studiesText || "none"}`,
        `Write the evidence synthesis.`,
      ].filter(Boolean).join("\n\n");

      // ── Step 1: appraise ──────────────────────────────────────────────────
      emit({ phase: "appraise", status: "start" });
      const first = await callClaude(env, basePrompt);
      if (first.kind === "refusal") { emit({ phase: "final", refusal: true }); controller.close(); return; }
      if (first.kind === "error") { emit({ phase: "final", error: "upstream", detail: first.detail }); controller.close(); return; }
      if (!first.text) { emit({ phase: "final", error: "empty" }); controller.close(); return; }
      emit({ phase: "appraise", status: "done", text: first.text, model });

      // ── Step 2: verify cited PMIDs live against PubMed ────────────────────
      const cited = citedPmids(first.text);
      emit({ phase: "verify", status: "start", pmids: cited });
      const { resolved, reachable } = await resolvePmids(cited);
      const ledger: LedgerEntry[] = cited.map((pmid) => ({
        pmid,
        inList: allow.has(pmid),
        resolved: resolved.has(pmid),
        checked: reachable,
      }));
      // A citation is trustworthy only if Claude drew it from the provided set AND
      // PubMed confirms it. When PubMed is unreachable we don't fail on resolution.
      const unverifiable = ledger.filter((e) => !e.inList || (e.checked && !e.resolved));
      emit({ phase: "verify", status: "done", ledger, reachable });

      // ── Step 3: revise (only when a cited PMID failed verification) ────────
      let finalText = first.text;
      if (unverifiable.length) {
        const bad = unverifiable.map((e) => e.pmid).join(", ");
        emit({ phase: "revise", status: "start", dropped: unverifiable.map((e) => e.pmid) });
        const revisePrompt = [
          basePrompt,
          `A citation check flagged these PMIDs as unverifiable (not in the provided set or not found in PubMed): ${bad}.`,
          `Rewrite the synthesis using ONLY verified studies from the provided list. Do not cite the flagged PMIDs.`,
        ].join("\n\n");
        const second = await callClaude(env, revisePrompt);
        if (second.kind === "text" && second.text) {
          finalText = second.text;
          emit({ phase: "revise", status: "done", text: second.text, model });
        } else {
          // Revision failed/declined — keep the appraisal but surface the caveat.
          emit({ phase: "revise", status: "skipped" });
        }
      }

      const verifiedCount = ledger.filter((e) => e.inList && (!e.checked || e.resolved)).length;
      emit({
        phase: "final",
        synthesis: finalText,
        ledger,
        reachable,
        verifiedCount,
        citedCount: cited.length,
        droppedCount: unverifiable.length,
        model,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

// Cloudflare Pages Function — POST /api/litreview
// Given a variant's PICO question and its retrieved studies, produces a concise
// evidence synthesis (a GRADE certainty judgement + bulleted evidence) using the
// Anthropic Messages API. The key is a Pages secret (ANTHROPIC_API_KEY) and never
// reaches the browser. Returns 503 when unset so the UI degrades gracefully.

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
PMID, then one caveat about confirming with the full robust-lit-review pipeline. Never
invent PMIDs or findings not in the provided list. Keep under 200 words. Plain text, no
markdown headers.`;

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

  const studiesText = (body.studies ?? [])
    .map((s) => `- ${s.title} (${s.journal}, ${s.year}${s.pmid ? `; PMID ${s.pmid}` : ""})`)
    .join("\n");
  const prompt = [
    `Alteration: ${body.gene} ${body.alteration} in ${body.cancerType}.`,
    `PICO question: ${body.pico?.question ?? ""}`,
    `Retrieved studies:\n${studiesText || "none"}`,
    `Write the evidence synthesis.`,
  ].filter(Boolean).join("\n\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return Response.json({ error: "upstream", status: resp.status, detail: detail.slice(0, 400) }, { status: 502 });
  }
  const data = (await resp.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  // Claude may decline in a high-stakes clinical framing. A refusal returns HTTP
  // 200, so guard on stop_reason and never render the refusal text as a synthesis.
  if (data.stop_reason === "refusal") {
    return Response.json(
      { error: "refusal", hint: "Claude declined this synthesis; fall back to the grounded appraisal." },
      { status: 422 },
    );
  }
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
  if (!text) {
    return Response.json({ error: "empty", hint: "No synthesis text returned." }, { status: 422 });
  }
  return Response.json({ synthesis: text });
};

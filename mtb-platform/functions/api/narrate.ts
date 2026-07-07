// Cloudflare Pages Function — POST /api/narrate
// Drafts speaker narration for the case-presentation deck: a short assessment plus
// board recommendations, from the report's molecular findings. Uses the Anthropic
// Messages API with a Pages secret (ANTHROPIC_API_KEY); returns 503 when unset so
// the deck degrades gracefully.

interface Env {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

interface Finding { gene: string; alteration: string; escat: string; drugs: string[] }
interface Body {
  patient: { cancerType: string; stage: string };
  biomarkers: { tmb: number; tmbClass: string; msi: string; hrdStatus: string };
  findings: Finding[];
  priorTherapy: string[];
}

const SYSTEM = `You are a molecular tumor board scribe. Produce speaker narration for a
case presentation: (1) a 2-3 sentence assessment of the molecular findings, then (2)
2-4 board recommendations or open questions. Cite ESCAT tiers and matched drugs. Do not
invent findings not provided. Keep under 160 words. Plain text, no markdown headers.`;

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "unconfigured", hint: "Set the ANTHROPIC_API_KEY Pages secret to enable narration." },
      { status: 503 },
    );
  }
  let body: Body;
  try { body = (await request.json()) as Body; } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }

  const findingsText = body.findings
    .map((f) => `- ${f.gene} ${f.alteration} (ESCAT ${f.escat})${f.drugs.length ? ` → ${f.drugs.slice(0, 3).join(", ")}` : ""}`)
    .join("\n");
  const prompt = [
    `Cancer: ${body.patient.cancerType}, stage ${body.patient.stage}.`,
    `Biomarkers: TMB ${body.biomarkers.tmb} (${body.biomarkers.tmbClass}), ${body.biomarkers.msi}, ${body.biomarkers.hrdStatus}.`,
    body.priorTherapy?.length ? `Prior therapy: ${body.priorTherapy.join("; ")}.` : "",
    `Actionable findings:\n${findingsText || "none"}`,
    `Write the case-presentation narration.`,
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
  // 200, so guard on stop_reason and never render the refusal text as narration.
  if (data.stop_reason === "refusal") {
    return Response.json(
      { error: "refusal", hint: "Claude declined to draft narration; present the findings directly." },
      { status: 422 },
    );
  }
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
  if (!text) {
    return Response.json({ error: "empty", hint: "No narration text returned." }, { status: 422 });
  }
  return Response.json({ narration: text });
};

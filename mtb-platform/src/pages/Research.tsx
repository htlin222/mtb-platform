import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SEED_TOPICS, OUTCOME_OPTIONS, COMPARATOR_OPTIONS, DEFAULT_INCLUSION,
  estimatePrisma, buildQuestion, type TopicSpec, type SeedTopic,
} from "../lib/research";
import { GlBadge, BookIcon } from "../components/gl";

type Role = "assistant" | "user";
interface Msg { role: Role; text: string }
type Step = "start" | "comparator" | "outcome" | "inclusion" | "terms" | "terms-add" | "confirm" | "done";

const GREETING =
  "I'm your research librarian. Let's turn a clinical or molecular gap into a systematic-review topic — PICO, scope, and a search strategy ready for the pipeline. What would you like to appraise?";

export default function Research() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: GREETING }]);
  const [step, setStep] = useState<Step>("start");
  const [spec, setSpec] = useState<Partial<TopicSpec>>({ priority: 4 });
  const [replies, setReplies] = useState<string[]>([...SEED_TOPICS.map((s) => s.title), "Describe my own"]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  function say(text: string, next: Step, nextReplies: string[], patch?: Partial<TopicSpec>) {
    setTyping(true);
    setReplies([]);
    window.setTimeout(() => {
      setTyping(false);
      if (patch) setSpec((s) => ({ ...s, ...patch }));
      setMessages((m) => [...m, { role: "assistant", text }]);
      setStep(next);
      setReplies(nextReplies);
    }, 560);
  }

  function handle(value: string) {
    const v = value.trim();
    if (!v) return;
    setMessages((m) => [...m, { role: "user", text: v }]);
    setReplies([]);
    setInput("");

    if (step === "start") {
      const seed: SeedTopic | undefined = SEED_TOPICS.find((s) => s.title === v);
      const patch: Partial<TopicSpec> = seed
        ? { title: seed.title, population: seed.population, intervention: seed.intervention, searchTerms: seed.searchTerms, outcome: seed.defaultOutcome }
        : { title: v, population: `Patients with ${v}`, intervention: "the candidate intervention", searchTerms: v.split(/[\s,]+/).filter(Boolean).slice(0, 5) };
      say(
        `Good topic. I've drafted the population as "${patch.population}" and the intervention as "${patch.intervention}". What is the comparator?`,
        "comparator", COMPARATOR_OPTIONS, patch,
      );
    } else if (step === "comparator") {
      say("And the primary outcome you want the review to weigh?", "outcome", OUTCOME_OPTIONS, { comparator: v });
    } else if (step === "outcome") {
      const q = buildQuestion({ population: spec.population!, intervention: spec.intervention!, comparator: spec.comparator!, outcome: v });
      say(
        `Here's the PICO question:\n"${q}"\n\nI'll apply the standard rigor filters. Keep them?`,
        "inclusion",
        ["Looks good", "Loosen to Q1–Q2 journals", "Include preclinical (mechanism only)"],
        { outcome: v, question: q, inclusion: DEFAULT_INCLUSION },
      );
    } else if (step === "inclusion") {
      let inc = [...DEFAULT_INCLUSION];
      if (v.startsWith("Loosen")) inc = inc.map((c) => (c.startsWith("Q1") ? "Q1–Q2 journal (SJR quartile)" : c));
      if (v.startsWith("Include preclinical")) inc = [...inc, "Preclinical studies (mechanism illustration only)"];
      say(
        `Noted. Proposed search terms: ${(spec.searchTerms ?? []).join(", ")}. Adjust the strategy?`,
        "terms", ["Looks good", "Add a term…"], { inclusion: inc },
      );
    } else if (step === "terms") {
      if (v.startsWith("Add")) { say("Type the term or MeSH heading to add.", "terms-add", []); return; }
      finalize();
    } else if (step === "terms-add") {
      const terms = [...(spec.searchTerms ?? []), v];
      setSpec((s) => ({ ...s, searchTerms: terms }));
      say(`Added "${v}". Anything else, or shall I finalise?`, "terms", ["Looks good", "Add a term…"]);
    } else if (step === "confirm") {
      if (v.startsWith("Create")) {
        const est = estimatePrisma(spec as TopicSpec);
        say(
          `Systematic-review project created and queued to robust-lit-review.\nEstimated PRISMA yield: ~${est.totalFound} records found → ${est.afterQuality} after Q1 quality filter → ~${est.included} included. GRADE will be assigned per outcome once screening completes.`,
          "done", [],
        );
      } else {
        say("Sure — what's the comparator?", "comparator", COMPARATOR_OPTIONS);
      }
    }
  }

  function finalize() {
    const est = estimatePrisma(spec as TopicSpec);
    say(
      `Topic spec is complete. I estimate ~${est.totalFound} candidate records, narrowing to ~${est.included} Q1, ≥2016, verified studies. Create the systematic-review project?`,
      "confirm", ["Create systematic review project", "Revise scope"],
    );
  }

  return (
    <div className="gl-page">
      <div className="gl-breadcrumb">
        <a role="button" onClick={() => navigate("/worklist")} style={{ cursor: "pointer" }}>Worklist</a>
        <span className="sep">/</span>Research topics
      </div>
      <div className="gl-page-title"><BookIcon size={20} /><h1>Research topic development</h1></div>
      <p className="gl-page-desc">
        Develop a curated systematic-review topic through dialogue. Clinical gaps become PICO
        questions with a rigor-filtered search strategy — the input to the robust-lit-review pipeline.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16, marginTop: 20, alignItems: "start" }}>
        {/* chat */}
        <div className="gl-card"><div className="gl-card-body">
          <div className="gl-chat">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`gl-msg ${m.role}`}>
                  <span className={`gl-msg-avatar ${m.role}`}>{m.role === "assistant" ? "◍" : "You"}</span>
                  <span className="gl-bubble" style={{ whiteSpace: "pre-line" }}>{m.text}</span>
                </div>
              </div>
            ))}
            {typing && (
              <div className="gl-msg assistant">
                <span className="gl-msg-avatar assistant">◍</span>
                <span className="gl-bubble"><span className="gl-typing"><span /><span /><span /></span></span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {replies.length > 0 && (
            <div className="gl-quickreplies">
              {replies.map((r) => <button key={r} className="gl-chip" onClick={() => handle(r)}>{r}</button>)}
            </div>
          )}

          {step !== "done" && (
            <form className="gl-chat-input" onSubmit={(e) => { e.preventDefault(); handle(input); }}>
              <input
                placeholder={step === "terms-add" ? "Type a search term…" : "Type your answer…"}
                value={input} onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" className="gl-button gl-button-confirm">Send</button>
            </form>
          )}

          {step === "done" && (
            <div style={{ marginTop: 14 }}>
              <button className="gl-button" onClick={() => navigate("/worklist")}>← Back to worklist</button>
            </div>
          )}
        </div></div>

        {/* live topic spec */}
        <aside className="gl-card" style={{ position: "sticky", top: 20 }}>
          <div className="gl-card-header">Topic spec {step === "done" && <GlBadge variant="success">Queued</GlBadge>}</div>
          <div className="gl-card-body">
            <SpecField label="Title" value={spec.title} />
            <div className="gl-section-title" style={{ margin: "12px 0 6px" }}>PICO</div>
            <SpecField label="Population" value={spec.population} sub />
            <SpecField label="Intervention" value={spec.intervention} sub />
            <SpecField label="Comparator" value={spec.comparator} sub />
            <SpecField label="Outcome" value={spec.outcome} sub />
            {spec.inclusion && (
              <>
                <div className="gl-section-title" style={{ margin: "12px 0 6px" }}>Inclusion criteria</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {spec.inclusion.map((c) => <li key={c} className="gl-text-sm gl-text-secondary" style={{ marginBottom: 2 }}>{c}</li>)}
                </ul>
              </>
            )}
            {spec.searchTerms && spec.searchTerms.length > 0 && (
              <>
                <div className="gl-section-title" style={{ margin: "12px 0 6px" }}>Search terms</div>
                <div className="gl-row gl-wrap" style={{ gap: 6 }}>
                  {spec.searchTerms.map((t) => <GlBadge key={t} variant="neutral">{t}</GlBadge>)}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SpecField({ label, value, sub }: { label: string; value?: string; sub?: boolean }) {
  return (
    <div style={{ marginBottom: sub ? 6 : 4 }}>
      <div className="gl-text-xs gl-text-muted">{label}</div>
      <div className={value ? "gl-text-sm" : "gl-text-sm gl-text-muted"}>{value || "—"}</div>
    </div>
  );
}

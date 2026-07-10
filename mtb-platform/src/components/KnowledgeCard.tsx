import { useState } from "react";
import type { Appraisal, LiteratureHit, Variant } from "../types";
import type { CiteSource } from "../lib/citation";
import { formatCitation } from "../lib/citation";
import { deriveKnowledge } from "../lib/pico";
import { GRADE_META, PROVENANCE_META, ESCAT_META } from "../lib/format";
import { logAudit, fingerprint } from "../lib/audit";
import {
	GlCard,
	GlBadge,
	ExternalLinkIcon,
	CheckIcon,
	SearchIcon,
	SyncIcon,
} from "./gl";
import CiteButton from "./CiteButton";

// ---------------------------------------------------------------------------
// Per-gene PICO-framed evidence card. When a real systematic-review Appraisal
// exists for the variant it renders the appraised layout (PICO + PRISMA funnel
// + GRADE + included studies); otherwise it derives a PICO deterministically
// and shows the gene's raw PubMed studies. A "Run robust-lit-review" button
// calls an Anthropic-backed endpoint for a live knowledge synthesis, degrading
// gracefully like AiSummary when the key isn't configured.
// ---------------------------------------------------------------------------

interface StudyRow {
	source: CiteSource;
	quartile?: "Q1" | "Q2" | "Q3" | "Q4";
	verified?: boolean;
	openAccess?: boolean;
	citationCount?: number;
}

// ── Live agent-loop event protocol (mirrors functions/api/litreview.ts) ──────
type Phase = "retrieve" | "appraise" | "verify" | "revise";
type StepStatus = "start" | "done" | "skipped";
interface TraceStep {
	phase: Phase;
	status: StepStatus;
}
interface LedgerEntry {
	pmid: string;
	inList: boolean;
	resolved: boolean;
	checked: boolean;
}
interface RetrievedStudy {
	pmid: string;
	title: string;
	journal: string;
	year: string;
	authors: string;
}
interface VerifyMeta {
	verifiedCount: number;
	citedCount: number;
	droppedCount: number;
	reachable: boolean;
}
interface LitEvent {
	phase: Phase | "final";
	status?: StepStatus;
	text?: string;
	ledger?: LedgerEntry[];
	refusal?: boolean;
	error?: string;
	synthesis?: string;
	verifiedCount?: number;
	citedCount?: number;
	droppedCount?: number;
	reachable?: boolean;
	count?: number;
	query?: string;
	studies?: RetrievedStudy[];
	model?: string;
}

const STEP_LABEL: Record<Phase, string> = {
	retrieve: "Retrieving evidence live from PubMed",
	appraise: "Appraising evidence with Claude",
	verify: "Verifying cited PMIDs against PubMed",
	revise: "Revising to drop unverifiable citations",
};

export default function KnowledgeCard({
	variant,
	appraisal,
	literature,
	cancerType,
}: {
	variant: Variant;
	appraisal?: Appraisal;
	literature: LiteratureHit[];
	cancerType: string;
}) {
	const derived = appraisal
		? null
		: deriveKnowledge(variant, cancerType, literature);

	const pico = appraisal ? appraisal.pico : derived!.pico;
	const grade = appraisal ? appraisal.grade : derived!.grade;
	const verdict = appraisal ? appraisal.verdict : derived!.verdict;

	const rows: StudyRow[] = appraisal
		? appraisal.includedStudies.map((s) => ({
				source: {
					authors: s.authors,
					title: s.title,
					journal: s.journal,
					year: s.year,
					pmid: s.pmid,
				},
				quartile: s.quartile,
				verified: s.verified,
				openAccess: s.openAccess,
				citationCount: s.citationCount,
			}))
		: derived!.studies.map((s) => ({ source: s }));

	const studies = rows.map((r) => r.source);
	const gradeMeta = GRADE_META[grade];

	// ── Live agent loop (Anthropic + PubMed verification, streamed) ────────────
	// Consumes the NDJSON stream from /api/litreview: appraise → verify → revise.
	// Each event drives a visible trace, so the loop (and its self-correction) is
	// shown, not just its result. Degrades gracefully like AiSummary.
	const [synthesis, setSynthesis] = useState<string | null>(null);
	const [trace, setTrace] = useState<TraceStep[]>([]);
	const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
	const [retrieved, setRetrieved] = useState<RetrievedStudy[] | null>(null);
	const [verifyMeta, setVerifyMeta] = useState<VerifyMeta | null>(null);
	const [state, setState] = useState<
		"idle" | "loading" | "unconfigured" | "refusal" | "error"
	>("idle");

	function upsertStep(phase: Phase, status: StepStatus) {
		setTrace((prev) => {
			const i = prev.findIndex((s) => s.phase === phase);
			if (i === -1) return [...prev, { phase, status }];
			const next = prev.slice();
			next[i] = { phase, status };
			return next;
		});
	}

	const ctx = `${variant.gene} ${variant.alteration}`;

	function handleEvent(ev: LitEvent) {
		switch (ev.phase) {
			case "retrieve":
				upsertStep("retrieve", ev.status ?? "start");
				if (ev.status === "done") {
					if (ev.studies) setRetrieved(ev.studies);
					logAudit({
						trust: "external-api",
						op: "agent.retrieve",
						source: "PubMed E-utilities",
						summary: `Retrieved ${ev.count ?? ev.studies?.length ?? 0} studies for ${ctx}`,
						detail: {
							query: ev.query,
							count: ev.count,
							reachable: ev.reachable,
						},
						patient: ctx,
					});
				}
				break;
			case "appraise":
				upsertStep("appraise", ev.status ?? "start");
				if (ev.status === "done" && ev.text) {
					setSynthesis(ev.text);
					logAudit({
						trust: "model",
						op: "agent.appraise",
						model: ev.model,
						summary: `Appraised evidence for ${ctx}`,
						patient: ctx,
						fingerprint: fingerprint(ev.text),
					});
				}
				break;
			case "verify":
				upsertStep("verify", ev.status ?? "start");
				if (ev.status === "done" && ev.ledger) {
					setLedger(ev.ledger);
					const ok = ev.ledger.filter(
						(e) => e.inList && (!e.checked || e.resolved),
					).length;
					logAudit({
						trust: "external-api",
						op: "agent.verify",
						source: "PubMed E-utilities",
						summary: `Verified ${ok}/${ev.ledger.length} cited PMIDs against PubMed${ev.reachable === false ? " (PubMed unreachable)" : ""}`,
						detail: {
							pmids: ev.ledger.map((e) => e.pmid),
							reachable: ev.reachable,
						},
						patient: ctx,
					});
				}
				break;
			case "revise":
				upsertStep("revise", ev.status ?? "start");
				if (ev.status === "done" && ev.text) {
					setSynthesis(ev.text);
					logAudit({
						trust: "model",
						op: "agent.revise",
						model: ev.model,
						summary: `Revised synthesis for ${ctx} to drop unverifiable citations`,
						patient: ctx,
						fingerprint: fingerprint(ev.text),
					});
				}
				break;
			case "final":
				if (ev.refusal) {
					logAudit({
						trust: "model",
						op: "agent.refusal",
						summary: `Claude declined the ${ctx} synthesis — fell back to the grounded appraisal`,
						patient: ctx,
					});
					setState("refusal");
					return;
				}
				if (ev.error) {
					setState("error");
					return;
				}
				logAudit({
					trust: "model",
					op: "agent.complete",
					model: ev.model,
					summary: `Appraisal complete for ${ctx} — ${ev.verifiedCount ?? 0} citations verified, ${ev.droppedCount ?? 0} dropped`,
					detail: {
						verifiedCount: ev.verifiedCount,
						citedCount: ev.citedCount,
						droppedCount: ev.droppedCount,
					},
					patient: ctx,
				});
				if (ev.synthesis) setSynthesis(ev.synthesis);
				if (ev.ledger) setLedger(ev.ledger);
				setVerifyMeta({
					verifiedCount: ev.verifiedCount ?? 0,
					citedCount: ev.citedCount ?? 0,
					droppedCount: ev.droppedCount ?? 0,
					reachable: ev.reachable ?? true,
				});
				setState("idle");
				break;
		}
	}

	async function runLitReview() {
		setState("loading");
		setSynthesis(null);
		setTrace([]);
		setLedger(null);
		setRetrieved(null);
		setVerifyMeta(null);
		const body = {
			gene: variant.gene,
			alteration: variant.alteration,
			cancerType,
			pico: { question: pico.question },
			studies: studies.map((s) => ({
				title: s.title,
				journal: s.journal,
				year: s.year,
				pmid: s.pmid,
			})),
		};
		try {
			const res = await fetch(`${import.meta.env.BASE_URL}api/litreview`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (res.status === 503) {
				setState("unconfigured");
				return;
			}
			if (!res.ok || !res.body) {
				setState("error");
				return;
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = "";
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				let nl: number;
				while ((nl = buf.indexOf("\n")) >= 0) {
					const line = buf.slice(0, nl).trim();
					buf = buf.slice(nl + 1);
					if (!line) continue;
					try {
						handleEvent(JSON.parse(line) as LitEvent);
					} catch {
						/* skip partial */
					}
				}
			}
			// If the stream ended without a terminal "final" event, don't hang on the spinner.
			setState((s) => (s === "loading" ? "idle" : s));
		} catch {
			setState("error");
		}
	}

	const baseText = variant.narrative
		? variant.narrative
		: `${grade} certainty. ${verdict}. Based on ${studies.length} retrieved record(s); run the pipeline for an appraised synthesis.`;

	// ── Export AMA references ─────────────────────────────────────────────────
	const [copied, setCopied] = useState(false);
	async function exportRefs() {
		try {
			await navigator.clipboard.writeText(
				studies.map((s, i) => `${i + 1}. ${formatCitation(s)}`).join("\n"),
			);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable — no-op */
		}
	}

	return (
		<GlCard
			header={
				<div
					className="gl-row gl-center gl-wrap"
					style={{ gap: 8, width: "100%" }}
				>
					<span className="mono gl-strong">{variant.gene}</span>
					<span className="mono gl-text-muted">{variant.alteration}</span>
					<GlBadge variant={ESCAT_META[variant.escat].variant}>
						{ESCAT_META[variant.escat].short}
					</GlBadge>
					<span className="gl-grow" />
					{appraisal ? (
						<GlBadge variant={PROVENANCE_META[appraisal.provenance].variant}>
							{PROVENANCE_META[appraisal.provenance].label}
						</GlBadge>
					) : (
						<GlBadge variant="neutral">Derived</GlBadge>
					)}
					<GlBadge variant={gradeMeta.variant}>{gradeMeta.label}</GlBadge>
				</div>
			}
		>
			<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
				{verdict}
			</div>
			<p
				className="gl-text-sm gl-text-secondary"
				style={{ margin: "0 0 14px" }}
			>
				{pico.question}
			</p>

			{/* PICO */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "auto 1fr",
					columnGap: 16,
					rowGap: 4,
					marginBottom: 16,
				}}
			>
				<Pico k="Population" v={pico.population} />
				<Pico k="Intervention" v={pico.intervention} />
				<Pico k="Comparator" v={pico.comparator} />
				<Pico k="Outcome" v={pico.outcome} />
			</div>

			{/* PRISMA funnel (appraised) or provenance line (derived) */}
			{appraisal ? (
				<PrismaFunnel a={appraisal} />
			) : (
				<p className="gl-text-xs gl-text-muted" style={{ margin: "0 0 16px" }}>
					Derived PICO · {literature.length} PubMed record(s) retrieved · not
					yet formally appraised
				</p>
			)}

			{/* Knowledge synthesis */}
			<div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>
				Knowledge synthesis
			</div>
			<p
				className="gl-text-sm"
				style={{ whiteSpace: "pre-line", lineHeight: 1.6, margin: 0 }}
			>
				{synthesis ?? baseText}
			</p>

			{/* Live agent trace — retrieve → appraise → verify → revise */}
			{trace.length > 0 && (
				<AgentTrace trace={trace} ledger={ledger} retrieved={retrieved} />
			)}

			{/* Studies pulled live from PubMed for a variant with no curated evidence */}
			{retrieved && retrieved.length > 0 && (
				<RetrievedStudies studies={retrieved} />
			)}

			{/* Verification ledger — every cited PMID checked live against PubMed */}
			{ledger && ledger.length > 0 && (
				<CitationLedger ledger={ledger} meta={verifyMeta} />
			)}

			<div
				style={{
					marginTop: 12,
					marginBottom: 16,
					display: "flex",
					gap: 10,
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				<button
					className="gl-button gl-button-confirm"
					onClick={runLitReview}
					disabled={state === "loading"}
					style={
						state === "loading" ? { opacity: 0.6, cursor: "wait" } : undefined
					}
				>
					{state === "loading"
						? "Running agent…"
						: synthesis
							? "Re-run"
							: "✦ Run robust-lit-review"}
				</button>
				{state === "unconfigured" && (
					<span className="gl-text-xs gl-text-muted">
						Set the ANTHROPIC_API_KEY secret to enable.
					</span>
				)}
				{state === "refusal" && (
					<span className="gl-text-xs gl-text-muted">
						Model declined — showing the appraised GRADE summary above.
					</span>
				)}
				{state === "error" && (
					<span className="gl-text-xs" style={{ color: "var(--red-700)" }}>
						Could not reach the appraisal service.
					</span>
				)}
			</div>

			{/* Included studies */}
			<details className="gl-disclosure">
				<summary
					className="gl-link-button"
					style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
				>
					Included studies ({rows.length})
				</summary>
				<div className="gl-col" style={{ gap: 10, marginTop: 10 }}>
					{rows.map((r, i) => (
						<div
							key={(r.source.pmid ?? r.source.title) + i}
							style={{
								paddingBottom: 10,
								borderBottom:
									i < rows.length - 1 ? "1px solid var(--border)" : "none",
							}}
						>
							{r.quartile && (
								<div
									className="gl-row gl-center"
									style={{ gap: 6, marginBottom: 2, flexWrap: "wrap" }}
								>
									<GlBadge
										variant={r.quartile === "Q1" ? "success" : "neutral"}
									>
										{r.quartile}
									</GlBadge>
									{r.verified && <GlBadge variant="info">Verified</GlBadge>}
									{r.openAccess && (
										<GlBadge variant="neutral">Open access</GlBadge>
									)}
									<span className="gl-text-xs gl-text-muted">
										{r.citationCount} citations
									</span>
								</div>
							)}
							<div className="gl-strong gl-text-sm">{r.source.title}</div>
							<div className="gl-text-xs gl-text-muted">
								{r.source.authors} · <em>{r.source.journal}</em> ·{" "}
								{r.source.year}
							</div>
							{r.source.pmid && <PmidLink pmid={r.source.pmid} />}
							<CiteButton source={r.source} />
						</div>
					))}
				</div>
			</details>

			{/* Footer: export references */}
			<div style={{ marginTop: 14 }}>
				<button type="button" className="gl-link-button" onClick={exportRefs}>
					{copied ? "✓ Copied" : "Export AMA references"}
				</button>
			</div>
		</GlCard>
	);
}

function PrismaFunnel({ a }: { a: Appraisal }) {
	const p = a.prisma;
	const max = p.totalFound || 1;
	const funnelRows: { label: string; value: number; included?: boolean }[] = [
		{ label: "Records found", value: p.totalFound },
		{ label: "After de-duplication", value: p.afterDedup },
		{ label: "After year filter", value: p.afterYearFilter },
		{ label: "After quality (Q1)", value: p.afterQuality },
		{ label: "Included", value: p.included, included: true },
	];
	return (
		<>
			<div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>
				PRISMA 2020 selection
			</div>
			<div className="gl-funnel" style={{ marginBottom: 16 }}>
				{funnelRows.map((r) => (
					<div className="gl-funnel-row" key={r.label}>
						<span className="gl-funnel-label">{r.label}</span>
						<span className="gl-funnel-track">
							<span
								className={`gl-funnel-bar${r.included ? " included" : ""}`}
								style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }}
							>
								{r.value}
							</span>
						</span>
					</div>
				))}
				<div className="gl-funnel-row">
					<span className="gl-funnel-label" />
					<span className="gl-funnel-excl">
						{p.excludedByQuality} excluded at quality screening
					</span>
				</div>
			</div>
		</>
	);
}

// Live trace of the agent loop. Each phase shows a spinner while running and a
// check when done, so the appraise → verify → revise loop is visible, not just
// its result. The "revise" row only appears if a citation actually failed.
function AgentTrace({
	trace,
	ledger,
	retrieved,
}: {
	trace: TraceStep[];
	ledger: LedgerEntry[] | null;
	retrieved: RetrievedStudy[] | null;
}) {
	const stepNote = (phase: Phase, status: StepStatus): string | null => {
		if (status !== "done") return null;
		if (phase === "retrieve") {
			if (!retrieved) return null;
			return retrieved.length ? `${retrieved.length} studies` : "no hits";
		}
		if (phase === "verify" && ledger) {
			const ok = ledger.filter(
				(e) => e.inList && (!e.checked || e.resolved),
			).length;
			return ledger.length ? `${ok}/${ledger.length} confirmed` : "none cited";
		}
		return null;
	};
	return (
		<div
			className="gl-col"
			style={{
				gap: 4,
				margin: "12px 0 0",
				padding: "10px 12px",
				background: "var(--gray-50, rgba(0,0,0,0.02))",
				borderRadius: 6,
			}}
		>
			<div className="gl-text-xs gl-text-muted" style={{ marginBottom: 2 }}>
				✦ Agent trace
			</div>
			{trace.map((s) => {
				const running = s.status === "start";
				const note = stepNote(s.phase, s.status);
				return (
					<div key={s.phase} className="gl-row gl-center" style={{ gap: 8 }}>
						<span
							style={{
								display: "inline-flex",
								width: 16,
								height: 16,
								color: running ? "var(--blue-500)" : "var(--green-600)",
							}}
						>
							{running ? (
								<Spinner phase={s.phase} />
							) : s.status === "skipped" ? (
								<span className="gl-text-muted">—</span>
							) : (
								<CheckIcon size={14} />
							)}
						</span>
						<span
							className="gl-text-sm"
							style={{ opacity: running ? 0.75 : 1 }}
						>
							{STEP_LABEL[s.phase]}
							{note && (
								<span className="gl-text-xs gl-text-muted"> · {note}</span>
							)}
							{s.status === "skipped" && (
								<span className="gl-text-xs gl-text-muted">
									{" "}
									· kept appraisal
								</span>
							)}
							{running && <span className="gl-text-muted">…</span>}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function Spinner({ phase }: { phase: Phase }) {
	const Icon =
		phase === "verify" || phase === "retrieve"
			? SearchIcon
			: phase === "revise"
				? SyncIcon
				: BeakerPulse;
	return (
		<span
			style={{
				display: "inline-flex",
				animation: "gl-spin 1.1s linear infinite",
			}}
		>
			<Icon size={14} />
		</span>
	);
}

// A tiny inline pulse mark for the appraise step (no beaker icon import needed).
function BeakerPulse({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a5 5 0 1 1 0 10A5 5 0 0 1 8 3Zm0 2a.75.75 0 0 1 .75.75v2.19l1.4 1.4a.75.75 0 1 1-1.06 1.06L7.4 9.66A.75.75 0 0 1 7.25 9V5.75A.75.75 0 0 1 8 5Z"
			/>
		</svg>
	);
}

// Studies the agent pulled live from PubMed for a variant that had no curated
// evidence — i.e. the drill-to-source path working on a judge-uploaded VCF.
function RetrievedStudies({ studies }: { studies: RetrievedStudy[] }) {
	return (
		<div style={{ marginTop: 10 }}>
			<div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>
				Retrieved live from PubMed · {studies.length} record(s)
			</div>
			<div className="gl-col" style={{ gap: 8 }}>
				{studies.map((s) => (
					<div key={s.pmid}>
						<div className="gl-strong gl-text-sm">{s.title}</div>
						<div className="gl-text-xs gl-text-muted">
							{s.authors} · <em>{s.journal}</em> · {s.year}
						</div>
						<a
							href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`}
							target="_blank"
							rel="noreferrer"
							className="mono gl-text-xs"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
								marginTop: 2,
							}}
						>
							PMID {s.pmid} <ExternalLinkIcon size={12} />
						</a>
					</div>
				))}
			</div>
		</div>
	);
}

// Every PMID the synthesis cited, checked against the provided set and PubMed.
// Green = drawn from the retrieved set and confirmed live; red = flagged and
// dropped in the revise step. This is the trust chip, inlined.
function CitationLedger({
	ledger,
	meta,
}: {
	ledger: LedgerEntry[];
	meta: VerifyMeta | null;
}) {
	return (
		<div style={{ marginTop: 10 }}>
			<div className="gl-text-xs gl-text-muted" style={{ marginBottom: 6 }}>
				Citation verification
				{meta && (
					<span>
						{" "}
						· {meta.verifiedCount}/{meta.citedCount} verified
						{meta.droppedCount ? ` · ${meta.droppedCount} dropped` : ""}
						{!meta.reachable ? " · PubMed unreachable" : " against PubMed"}
					</span>
				)}
			</div>
			<div className="gl-row gl-wrap" style={{ gap: 6 }}>
				{ledger.map((e) => {
					const good = e.inList && (!e.checked || e.resolved);
					return (
						<a
							key={e.pmid}
							href={`https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`}
							target="_blank"
							rel="noreferrer"
							title={
								good
									? "In retrieved set · confirmed on PubMed"
									: e.inList
										? "Not found on PubMed — dropped"
										: "Not in retrieved set — dropped"
							}
						>
							<GlBadge variant={good ? "success" : "danger"}>
								{good ? "✓" : "✗"} PMID {e.pmid}
							</GlBadge>
						</a>
					);
				})}
			</div>
		</div>
	);
}

function Pico({ k, v }: { k: string; v: string }) {
	return (
		<>
			<span
				className="gl-text-xs gl-text-muted"
				style={{ whiteSpace: "nowrap" }}
			>
				{k}
			</span>
			<span className="gl-text-sm">{v}</span>
		</>
	);
}

function PmidLink({ pmid }: { pmid: string }) {
	return (
		<a
			href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
			target="_blank"
			rel="noreferrer"
			className="mono gl-text-xs"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				marginTop: 4,
			}}
		>
			PMID {pmid} <ExternalLinkIcon size={12} />
		</a>
	);
}

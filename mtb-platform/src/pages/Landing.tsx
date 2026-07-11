import { useNavigate } from "react-router-dom";
import { useReveal, useScrollProgress, useCountUp } from "../lib/useReveal";
import { useLang, pick, type Lang } from "../lib/i18n";
import LangToggle from "../components/LangToggle";
import {
	BeakerIcon,
	PulseIcon,
	ScaleIcon,
	BookIcon,
	CheckIcon,
	SyncIcon,
	ChevronRightIcon,
} from "../components/gl";
import "../landing.css";

/* --------------------------------------------------------------------------
   Copy — English is the source of truth; zh-TW mirrors it. English renders if
   a key is ever missing (see i18n.pick).
   -------------------------------------------------------------------------- */
type Bi = Record<Lang, string>;
const bi = (en: string, zh: string): Bi => ({ en, "zh-TW": zh });

const COPY = {
	brand: bi("Molecular Tumor Board", "Molecular Tumor Board"),
	liveDemo: bi("Live demo", "Live demo"),
	eyebrow: bi("Built with Claude · Life Sciences 2026", "Built with Claude · Life Sciences 2026"),
	h1a: bi("Turn the molecular tumor board into a", "把分子腫瘤委員會,變成一個"),
	h1b: bi("clinical evidence system that upgrades itself", "會自我升級的臨床證據系統"),
	heroLead: bi(
		"How a community cancer center that runs NGS — but can't staff a full MTB specialty panel — uses agents to connect minute-level “what do we do for this patient now” decisions to human-verified systematic reviews measured in days and weeks, so every evidence gap at the bedside becomes a research agenda item.",
		"一間跑得起 NGS、卻養不起大型 MTB 專科團隊的社區癌症中心,如何用 agent 把「這病人現在怎麼辦」的分鐘級決策,接上以天/週計、人工驗證的系統性回顧 — 讓臨床現場的每一個證據缺口,自動變成研究議程。",
	),
	ctaEnter: bi("Enter live demo", "進入 live demo"),
	ctaFlywheel: bi("See how the flywheel works", "看飛輪如何運作"),
	statGenes: bi("genes on the TSO500 panel", "TSO500 panel 基因數"),
	statFlows: bi("workflows sharing one evidence library", "共用同一證據庫的工作流"),
	statProv: bi("of report recommendations trace to provenance", "報告建議可追溯到 provenance"),

	problemKicker: bi("The problem", "The problem"),
	problemH2: bi(
		"Small hospitals can't staff a full MTB — or a research team",
		"小醫院開不起大型 MTB,也養不起研究團隊",
	),
	problemLead: bi(
		"The attending needs “what do we do for this patient now,” in minutes. A systematic review needs dual screening, inclusion/exclusion, maybe meta-analysis — days to weeks. The two run at wildly different tempos, and most tools only serve one side: the fast one lacks evidentiary depth, the slow one can't keep up with the bedside.",
		"主治要的是「這病人現在怎麼辦」,以分鐘計;系統性回顧要多人雙篩、納入排除、可能 meta-analysis,以天/週計。兩者節奏天差地遠 — 大部分工具只做得了其中一邊,於是快的沒有證據深度,慢的追不上臨床現場。",
	),

	archKicker: bi("The architecture", "The architecture"),
	archH2: bi("Good architecture lets the slow feed the fast", "漂亮的架構,是讓慢的餵養快的"),
	archLead: bi(
		"Not the two workflows competing — each runs at its own tempo, sharing one evidence library.",
		"不是讓兩條工作流競爭,而是讓它們跑在各自的節奏上、共用同一個證據庫。",
	),
	fastTag: bi("In minutes", "以分鐘計"),
	fastH3: bi("MTB report — fast", "MTB 報告 — 快"),
	fastBody: bi(
		"The moment a patient's molecular findings arrive, the agent drafts a sign-off-ready report. The attending decides right then — no review needs to finish first.",
		"病人的分子發現一進來,agent 先出可簽核的快速版報告。主治當下就能決策,不必等任何回顧完成。",
	),
	slowTag: bi("Days to weeks", "以天/週計"),
	slowH3: bi("PRISMA systematic review — slow", "PRISMA 系統性回顧 — 慢"),
	slowBody: bi(
		"Runs asynchronously in the background: dual screening, inclusion/exclusion, conflict arbitration. When done, the evidence is promoted to the highest trust tier and feeds every future report.",
		"背景非同步跑:多人雙篩、納入排除、衝突仲裁。完成後,證據升級成最高信任等級,餵回未來所有報告。",
	),
	ruleLabel: bi("Iron rule:", "鐵律:"),
	ruleBody: bi(
		"the MTB report always ships a fast, sign-off-ready version first. The systematic review is an asynchronous background upgrade to the evidence — ",
		"MTB 報告永遠先出快速版、可簽核。系統性回顧是背景非同步升級證據,",
	),
	ruleEmph: bi("never a gate in front of the report", "不是報告的前置關卡"),

	provKicker: bi("Graded provenance", "Graded provenance"),
	provH2: bi("Every recommendation wears the depth of its evidence", "每條建議,都掛著它證據的深度"),
	provLead: bi(
		"Mapped exactly to the evidence tiers an attending already understands — open it and you see where the backing came from.",
		"剛好對應主治本來就懂的證據等級 — 點開就看得到背書從哪來。",
	),
	tierStrongH3: bi("Completed systematic review — strongest", "完成的系統性回顧背書 — 最強"),
	tierStrongBody: bi(
		"Open it for the full PRISMA flow and inclusion list. Human dual-screened, trustworthy on the spot.",
		"點開見完整 PRISMA flow + 納入清單。人工雙篩驗證過,即時可信。",
	),
	tierMidH3: bi("Rapid review — moderate", "快速回顧背書 — 中等"),
	tierMidBody: bi(
		"Staged and auditable too, but clearly flagged “not yet formally reviewed,” with one-click upgrade.",
		"一樣分階段、可稽核,但明確標記「尚未正式回顧」,附一鍵升級。",
	),
	tierLoopH3: bi("One-click “promote to systematic review”", "一鍵「升級為系統性回顧」"),
	tierLoopBody: bi(
		"The caveat isn't a dead end — it's the entrance to the flywheel. Press it and the gap enters the research agenda.",
		"caveat 不是死路 — 它是飛輪的入口。按下去,缺口就進了研究議程。",
	),

	flyKicker: bi("The flywheel · the sharpest differentiator", "The flywheel · 全案最強差異化"),
	flyH2: bi("Bedside demand drives the research agenda directly", "臨床現場的需求,直接驅動研究議程"),
	flyLead: bi(
		"This loop isn't hand-waving — the PRISMA pipeline already exists and can be run live for judges. Scroll down to watch it light up step by step.",
		"這個迴圈不是用嘴講的 — PRISMA pipeline 已是現成的,可以當場演給評審看。往下捲,看它一步步點亮。",
	),
	flyLoopback: bi(
		"The loop restarts — bedside demand drives the research agenda",
		"迴圈重新開始 — 臨床現場的需求直接驅動研究議程",
	),

	libKicker: bi("One library, two interfaces", "One library, two interfaces"),
	libH2: bi("Both tracks share one infrastructure", "兩條線共用同一套基礎設施"),
	libLead: bi(
		"MTB worklist (per-patient) and Reviews (review projects) are two object types with two lifecycles — but they share one Evidence Library, tagged by topic / variant / drug.",
		"MTB worklist(逐病人)與 Reviews(回顧專案)是兩種物件、兩種生命週期 — 但依 topic / variant / drug 標籤,共用同一個 Evidence Library。",
	),
	libWorklistH3: bi("MTB Worklist", "MTB Worklist"),
	libWorklistBody: bi(
		"Per-patient, in minutes. Fast report, sign-off-ready, wearing graded provenance.",
		"逐病人、以分鐘計。快速報告、可簽核、掛著分級 provenance。",
	),
	libReviewsH3: bi("Reviews", "Reviews"),
	libReviewsBody: bi(
		"Review projects, in days to weeks. PRISMA dual screening, inclusion/exclusion, conflict arbitration.",
		"回顧專案、以天/週計。PRISMA 雙篩、納入排除、衝突仲裁。",
	),
	libCore: bi(
		"↑ Sharing one Evidence Library ↑ — for a small hospital that can't staff a full MTB, “two tracks on shared infrastructure” is the strongest efficiency argument.",
		"↑ 共用同一個 Evidence Library ↑ — 對開不起大型 MTB 的小醫院,「兩條線共用基礎設施」正是最強的效率論點。",
	),

	finalH2: bi("See it run, right now", "現在就看它跑起來"),
	finalLead: bi(
		"Real TSO500 data, live PubMed retrieval, a streaming appraisal agent, an auditable agent audit trail — it's all in the demo.",
		"真實 TSO500 資料、live PubMed 檢索、streaming appraisal agent、可稽核的 agent audit trail — 全都在 demo 裡。",
	),
	finalCta: bi("Enter the Molecular Tumor Board", "進入 Molecular Tumor Board"),
	footnote: bi(
		"Koo Foundation Sun Yat-Sen Cancer Center · Built with Claude: Life Sciences 2026",
		"Koo Foundation Sun Yat-Sen Cancer Center · Built with Claude: Life Sciences 2026",
	),
} satisfies Record<string, Bi>;

const CHIPS = [
	"Streaming appraisal agent",
	"Live PubMed retrieval",
	"Agent audit trail",
	"Provenance panel",
	"Mutation mapper",
	"Citation checker",
];

const FLYWHEEL: Record<Lang, { title: string; body: string }[]> = {
	en: [
		{ title: "A report exposes an evidence gap", body: "A recommendation hangs on only a rapid review, low evidence tier — the system flags it on the spot." },
		{ title: "The gap becomes a review candidate", body: "That variant / drug topic auto-queues as a candidate, waiting for someone to pick it up." },
		{ title: "The team runs the PRISMA pipeline", body: "Dual screening, inclusion/exclusion, conflict arbitration — a human-verified systematic review." },
		{ title: "Future reports auto-upgrade", body: "The same molecular finding next time cites the highest-trust review backing directly." },
		{ title: "Back to the bedside", body: "Exposes the next gap — clinical demand keeps driving the research agenda." },
	],
	"zh-TW": [
		{ title: "臨床報告暴露證據缺口", body: "某條建議只掛得上一份快速回顧、低證據等級 — 系統當場標記它。" },
		{ title: "缺口成為回顧候選題目", body: "這個 variant／drug 主題自動排進候選佇列,等人接手。" },
		{ title: "團隊跑 PRISMA pipeline", body: "多人雙篩、納入排除、衝突仲裁 — 人工驗證的系統性回顧。" },
		{ title: "未來報告自動升級", body: "同一個分子發現,下次直接引用最高信任等級的回顧背書。" },
		{ title: "回到臨床現場", body: "暴露下一個缺口 — 臨床需求持續驅動研究議程。" },
	],
};

/** A section that fades its children up once scrolled into view. */
function Reveal({
	children,
	className = "",
	i = 0,
}: {
	children: React.ReactNode;
	className?: string;
	i?: number;
}) {
	const { ref, shown } = useReveal<HTMLDivElement>();
	return (
		<div
			ref={ref}
			className={`lp-reveal ${shown ? "is-shown" : ""} ${className}`}
			style={{ ["--i" as string]: i }}
		>
			{children}
		</div>
	);
}

function Stat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
	const { ref, shown } = useReveal<HTMLDivElement>();
	const value = useCountUp(target, shown);
	return (
		<div ref={ref} className="lp-stat">
			<div className="lp-stat-num">
				{Math.round(value)}
				{suffix}
			</div>
			<div className="lp-stat-label">{label}</div>
		</div>
	);
}

function Flywheel({ lang }: { lang: Lang }) {
	const { ref, progress } = useScrollProgress<HTMLDivElement>();
	const steps = pick(lang, FLYWHEEL);
	// Map scroll progress across the section to N lit steps.
	const lit = Math.min(steps.length, Math.floor(progress * (steps.length + 0.6)));
	return (
		<div className="lp-wheel" ref={ref}>
			{steps.map((s, idx) => (
				<div key={s.title} className={`lp-step ${idx < lit ? "is-lit" : ""}`}>
					<span className="lp-step-num">{idx + 1}</span>
					<div>
						<h3>{s.title}</h3>
						<p>{s.body}</p>
					</div>
				</div>
			))}
			<div className="lp-wheel-loopback">
				<SyncIcon size={13} /> {pick(lang, COPY.flyLoopback)}
			</div>
		</div>
	);
}

export default function Landing() {
	const navigate = useNavigate();
	const lang = useLang();
	const t = (k: keyof typeof COPY) => pick(lang, COPY[k]);
	const enter = () => navigate("/worklist");

	return (
		<div className="lp">
			{/* top bar */}
			<div className="lp-topbar">
				<span className="lp-brand">
					<img
						src={`${import.meta.env.BASE_URL}kfsyscc-logo.webp`}
						alt="Koo Foundation Sun Yat-Sen Cancer Center"
					/>
					<span>{t("brand")}</span>
				</span>
				<span className="lp-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<LangToggle />
					<button
						className="lp-btn lp-btn-primary"
						onClick={enter}
						style={{ padding: "8px 16px", fontSize: 14 }}
					>
						{t("liveDemo")} <ChevronRightIcon size={14} />
					</button>
				</span>
			</div>

			{/* hero */}
			<header className="lp-hero">
				<div className="lp-orbits" aria-hidden="true">
					<span className="lp-orbit" style={{ width: 220, height: 220, top: "12%", left: "8%" }} />
					<span className="lp-orbit" style={{ width: 140, height: 140, top: "56%", left: "18%", animationDelay: "-4s" }} />
					<span className="lp-orbit" style={{ width: 300, height: 300, top: "8%", right: "6%", animationDelay: "-7s" }} />
					<span className="lp-orbit" style={{ width: 120, height: 120, bottom: "8%", right: "22%", animationDelay: "-2s" }} />
				</div>
				<div className="lp-hero-inner">
					<span className="lp-eyebrow">
						<span className="lp-dot" /> {t("eyebrow")}
					</span>
					<h1 className="lp-h1">
						{t("h1a")}
						<br />
						<span className="lp-accent">{t("h1b")}</span>
					</h1>
					<p className="lp-lead">{t("heroLead")}</p>
					<div className="lp-cta-row">
						<button className="lp-btn lp-btn-primary" onClick={enter}>
							<BeakerIcon size={16} /> {t("ctaEnter")}
						</button>
						<a className="lp-btn" href="#flywheel">
							<SyncIcon size={16} /> {t("ctaFlywheel")}
						</a>
					</div>
					<div className="lp-stats">
						<Stat target={523} suffix="" label={t("statGenes")} />
						<Stat target={2} suffix="" label={t("statFlows")} />
						<Stat target={100} suffix="%" label={t("statProv")} />
					</div>
				</div>
			</header>

			{/* problem */}
			<section className="lp-section">
				<Reveal>
					<div className="lp-kicker">{t("problemKicker")}</div>
					<h2 className="lp-h2">{t("problemH2")}</h2>
					<p className="lp-lead">{t("problemLead")}</p>
				</Reveal>
			</section>

			{/* two tempos */}
			<section className="lp-section" style={{ paddingTop: 0 }}>
				<Reveal>
					<div className="lp-kicker">{t("archKicker")}</div>
					<h2 className="lp-h2">{t("archH2")}</h2>
					<p className="lp-lead">{t("archLead")}</p>
				</Reveal>
				<div className="lp-tempo">
					<Reveal className="lp-tempo-card lp-tempo-fast" i={0}>
						<span className="lp-tempo-tag">
							<PulseIcon size={12} /> {t("fastTag")}
						</span>
						<h3>{t("fastH3")}</h3>
						<p>{t("fastBody")}</p>
					</Reveal>
					<Reveal className="lp-tempo-card lp-tempo-slow" i={1}>
						<span className="lp-tempo-tag">
							<BookIcon size={12} /> {t("slowTag")}
						</span>
						<h3>{t("slowH3")}</h3>
						<p>{t("slowBody")}</p>
					</Reveal>
				</div>
				<Reveal className="lp-rule">
					<strong>{t("ruleLabel")}</strong>
					{t("ruleBody")}
					<strong>{t("ruleEmph")}</strong>.
				</Reveal>
			</section>

			{/* provenance ladder */}
			<section className="lp-section" style={{ paddingTop: 0 }}>
				<Reveal>
					<div className="lp-kicker">{t("provKicker")}</div>
					<h2 className="lp-h2">{t("provH2")}</h2>
					<p className="lp-lead">{t("provLead")}</p>
				</Reveal>
				<div className="lp-ladder">
					<Reveal className="lp-tier lp-tier-strong" i={0}>
						<span className="lp-tier-badge">
							<CheckIcon size={20} />
						</span>
						<div style={{ flex: 1 }}>
							<h3>{t("tierStrongH3")}</h3>
							<p>{t("tierStrongBody")}</p>
							<div className="lp-tier-meter">
								<span className="lp-tier-strong-fill" />
							</div>
						</div>
					</Reveal>
					<Reveal className="lp-tier lp-tier-mid" i={1}>
						<span className="lp-tier-badge">
							<PulseIcon size={20} />
						</span>
						<div style={{ flex: 1 }}>
							<h3>{t("tierMidH3")}</h3>
							<p>{t("tierMidBody")}</p>
							<div className="lp-tier-meter">
								<span className="lp-tier-mid-fill" />
							</div>
						</div>
					</Reveal>
					<Reveal className="lp-tier lp-tier-loop" i={2}>
						<span className="lp-tier-badge">
							<SyncIcon size={20} />
						</span>
						<div style={{ flex: 1 }}>
							<h3>{t("tierLoopH3")}</h3>
							<p>{t("tierLoopBody")}</p>
						</div>
					</Reveal>
				</div>
			</section>

			{/* flywheel */}
			<section className="lp-section lp-flywheel" id="flywheel">
				<Reveal>
					<div className="lp-kicker">{t("flyKicker")}</div>
					<h2 className="lp-h2">{t("flyH2")}</h2>
					<p className="lp-lead">{t("flyLead")}</p>
				</Reveal>
				<Flywheel lang={lang} />
			</section>

			{/* shared library */}
			<section className="lp-section" style={{ paddingTop: 0 }}>
				<Reveal>
					<div className="lp-kicker">{t("libKicker")}</div>
					<h2 className="lp-h2">{t("libH2")}</h2>
					<p className="lp-lead">{t("libLead")}</p>
				</Reveal>
				<div className="lp-libgrid">
					<Reveal className="lp-libcard" i={0}>
						<h3>
							<BeakerIcon size={18} /> {t("libWorklistH3")}
						</h3>
						<p>{t("libWorklistBody")}</p>
					</Reveal>
					<Reveal className="lp-libcard" i={1}>
						<h3>
							<ScaleIcon size={18} /> {t("libReviewsH3")}
						</h3>
						<p>{t("libReviewsBody")}</p>
					</Reveal>
				</div>
				<Reveal className="lp-libcore">{t("libCore")}</Reveal>
			</section>

			{/* final CTA */}
			<section className="lp-final">
				<Reveal>
					<h2 className="lp-h2">{t("finalH2")}</h2>
					<p className="lp-lead">{t("finalLead")}</p>
					<div className="lp-cta-row">
						<button className="lp-btn lp-btn-primary" onClick={enter}>
							<BeakerIcon size={16} /> {t("finalCta")}
						</button>
					</div>
					<div className="lp-chips">
						{CHIPS.map((c) => (
							<span key={c} className="lp-chip">
								{c}
							</span>
						))}
					</div>
					<div className="lp-footnote">{t("footnote")}</div>
				</Reveal>
			</section>
		</div>
	);
}

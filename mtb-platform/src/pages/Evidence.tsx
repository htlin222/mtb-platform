import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlCard, BookIcon, ExternalLinkIcon } from "../components/gl";

interface Citation {
	authors: string;
	title: string;
	journal: string;
	year: number;
	pmid: string;
	doi: string;
}
interface Section {
	pillar: string;
	summary: string;
	citations: Citation[];
}
interface EvidenceBase {
	intro: string;
	sections: Section[];
	attribution: string;
}

export default function Evidence() {
	const navigate = useNavigate();
	const [d, setD] = useState<EvidenceBase | null>(null);
	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}data/evidence-base.json`)
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d)
		return (
			<div className="gl-page">
				<div className="gl-spinner" />
			</div>
		);

	return (
		<div className="gl-page" style={{ maxWidth: 900 }}>
			<div className="gl-breadcrumb">
				<a
					role="button"
					onClick={() => navigate("/worklist")}
					style={{ cursor: "pointer" }}
				>
					Worklist
				</a>
				<span className="sep">/</span>Evidence base
			</div>
			<div className="gl-page-title">
				<BookIcon size={20} />
				<h1>Evidence base &amp; methods</h1>
			</div>
			<p className="gl-page-desc">{d.intro}</p>

			<div className="gl-col" style={{ marginTop: 20 }}>
				{d.sections.map((s) => (
					<GlCard key={s.pillar} header={s.pillar}>
						<p
							className="gl-text-sm gl-text-secondary"
							style={{ margin: "0 0 14px", lineHeight: 1.6 }}
						>
							{s.summary}
						</p>
						<div className="gl-col" style={{ gap: 10 }}>
							{s.citations.map((c) => (
								<div
									key={c.pmid}
									style={{
										paddingLeft: 12,
										borderLeft: "2px solid var(--border-strong)",
									}}
								>
									<div className="gl-text-sm">
										<span className="gl-strong">{c.authors}</span> {c.title}{" "}
										<span style={{ fontStyle: "italic" }}>{c.journal}</span>.{" "}
										{c.year}.
									</div>
									<div
										className="gl-row gl-center"
										style={{ gap: 10, marginTop: 4 }}
									>
										<a
											href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
											target="_blank"
											rel="noreferrer"
											className="mono gl-text-xs"
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
											}}
										>
											PMID {c.pmid} <ExternalLinkIcon size={12} />
										</a>
										<a
											href={`https://doi.org/${c.doi}`}
											target="_blank"
											rel="noreferrer"
											className="mono gl-text-xs"
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
											}}
										>
											{c.doi} <ExternalLinkIcon size={12} />
										</a>
									</div>
								</div>
							))}
						</div>
					</GlCard>
				))}
			</div>

			<p className="gl-text-xs gl-text-muted" style={{ marginTop: 20 }}>
				{d.attribution}
			</p>
		</div>
	);
}

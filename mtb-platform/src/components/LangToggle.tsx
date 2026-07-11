import { useLang, setLang, type Lang } from "../lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
	{ value: "en", label: "EN" },
	{ value: "zh-TW", label: "繁中" },
];

/** Global language switch. Reuses the Pajamas segmented-control styling. */
export default function LangToggle({ className = "" }: { className?: string }) {
	const lang = useLang();
	return (
		<div className={`gl-segmented ${className}`} role="group" aria-label="Language">
			{OPTIONS.map((o) => (
				<button
					key={o.value}
					className={lang === o.value ? "active" : ""}
					aria-pressed={lang === o.value}
					onClick={() => setLang(o.value)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

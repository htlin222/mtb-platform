import { useSyncExternalStore } from "react";

export type Lang = "en" | "zh-TW";

const KEY = "mtb.lang";
const DEFAULT: Lang = "en";

function read(): Lang {
	if (typeof localStorage === "undefined") return DEFAULT;
	const v = localStorage.getItem(KEY);
	return v === "zh-TW" || v === "en" ? v : DEFAULT;
}

let current: Lang = read();
const listeners = new Set<() => void>();

export function getLang(): Lang {
	return current;
}

export function setLang(lang: Lang) {
	if (lang === current) return;
	current = lang;
	try {
		localStorage.setItem(KEY, lang);
	} catch {
		/* ignore quota / privacy-mode failures */
	}
	if (typeof document !== "undefined") {
		document.documentElement.lang = lang === "zh-TW" ? "zh-Hant" : "en";
	}
	for (const l of listeners) l();
}

function subscribe(cb: () => void) {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

/** Reactive current language. Components re-render on toggle. */
export function useLang(): Lang {
	return useSyncExternalStore(subscribe, getLang, () => DEFAULT);
}

/**
 * Pick the string for the active language from a `{ en, "zh-TW" }` pair.
 * Falls back to English so a missing translation never renders blank.
 */
export function pick<T>(lang: Lang, dict: Record<Lang, T>): T {
	return dict[lang] ?? dict.en;
}

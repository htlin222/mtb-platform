import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveal-on-scroll: returns a ref + a boolean that flips true the first time the
 * element scrolls into view. Reduced-motion users get `true` immediately, so the
 * content is never gated behind an animation they've opted out of.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
	options: IntersectionObserverInit = { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
) {
	const ref = useRef<T>(null);
	const [shown, setShown] = useState(prefersReducedMotion());

	useEffect(() => {
		if (prefersReducedMotion()) return;
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver((entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					setShown(true);
					io.disconnect();
				}
			}
		}, options);
		io.observe(el);
		return () => io.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { ref, shown };
}

/**
 * Scroll progress (0→1) of an element travelling through the viewport. Drives the
 * flywheel's step-by-step highlight. Reduced-motion users get a static 1.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
	const ref = useRef<T>(null);
	const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);

	useEffect(() => {
		if (prefersReducedMotion()) return;
		const el = ref.current;
		if (!el) return;
		let raf = 0;
		const update = () => {
			raf = 0;
			const rect = el.getBoundingClientRect();
			const vh = window.innerHeight || 1;
			// 0 when the top hits the bottom of the viewport, 1 when the bottom
			// has scrolled to the top — the element's full pass through the frame.
			const total = rect.height + vh;
			const passed = vh - rect.top;
			setProgress(Math.max(0, Math.min(1, passed / total)));
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			if (raf) cancelAnimationFrame(raf);
		};
	}, []);

	return { ref, progress };
}

/**
 * Count-up that fires once the element is in view. Integer-friendly; formats via
 * the caller. Reduced-motion → jumps straight to the target.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1100) {
	const [value, setValue] = useState(prefersReducedMotion() ? target : 0);

	useEffect(() => {
		if (!active || prefersReducedMotion()) {
			setValue(target);
			return;
		}
		let raf = 0;
		let start = 0;
		const step = (ts: number) => {
			if (!start) start = ts;
			const t = Math.min(1, (ts - start) / durationMs);
			// easeOutCubic
			const eased = 1 - Math.pow(1 - t, 3);
			setValue(target * eased);
			if (t < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [target, active, durationMs]);

	return value;
}

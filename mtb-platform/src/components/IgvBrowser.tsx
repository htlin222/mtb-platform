import { useEffect, useRef, useState } from "react";
import igv from "igv";

interface Track { name: string; type: string; features: unknown[]; height?: number; displayMode?: string }

/** Embeds an IGV.js genome browser (hg19) with the given annotation tracks. */
export default function IgvBrowser({ tracks, locus }: { tracks: Track[]; locus: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (igv as any)
      .createBrowser(containerRef.current, {
        genome: "hg19",
        locus,
        tracks,
        showChromosomeWidget: false,
        showCenterGuide: false,
      })
      .then((b: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (cancelled) { (igv as any).removeBrowser(b); return; }
        browserRef.current = b;
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (browserRef.current) { try { (igv as any).removeBrowser(browserRef.current); } catch { /* noop */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="igv-wrap">
      {status === "loading" && <div className="gl-text-sm gl-text-muted" style={{ padding: 12 }}>Loading GRCh37 reference…</div>}
      {status === "error" && <div className="gl-text-sm" style={{ padding: 12, color: "var(--red-700)" }}>Could not load the genome browser (needs network for the hg19 reference).</div>}
      <div ref={containerRef} />
    </div>
  );
}

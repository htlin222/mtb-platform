import { useState } from "react";
import { formatCitation, mybibUrl, type CiteSource, type CitationStyle } from "../lib/citation";
import { ExternalLinkIcon } from "./gl";

// Copies a formatted citation to the clipboard (AMA by default, the medical
// standard) with a style switch, plus a mybib.com hand-off for fine-tuning.
export default function CiteButton({ source }: { source: CiteSource }) {
  const [style, setStyle] = useState<CitationStyle>("ama");
  const [copied, setCopied] = useState(false);

  async function copy(next: CitationStyle) {
    try {
      await navigator.clipboard.writeText(formatCitation(source, next));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="gl-row gl-center" style={{ gap: 6, marginTop: 4 }}>
      <button type="button" className="gl-link-button" onClick={() => copy(style)}>
        {copied ? "✓ Copied" : `Cite (${style.toUpperCase()})`}
      </button>
      <select
        className="gl-text-xs"
        value={style}
        aria-label="Citation style"
        onChange={(e) => { const s = e.target.value as CitationStyle; setStyle(s); copy(s); }}
        style={{ border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg-surface)", padding: "1px 4px" }}
      >
        <option value="ama">AMA</option>
        <option value="vancouver">Vancouver</option>
        <option value="apa">APA</option>
      </select>
      <a href={mybibUrl(source)} target="_blank" rel="noreferrer"
        className="gl-text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        mybib <ExternalLinkIcon size={11} />
      </a>
    </div>
  );
}

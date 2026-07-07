import type { ReactNode } from "react";

// Minimal inline markdown for the curated narratives: **bold**, *italic*,
// paragraph breaks, and linkified "PMID: nnnn". No dependencies.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|PMID:\s*(\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyPrefix}-b${i}`}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={`${keyPrefix}-i${i}`} className="mono">{m[2]}</em>);
    else if (m[3])
      out.push(
        <a key={`${keyPrefix}-p${i}`} href={`https://pubmed.ncbi.nlm.nih.gov/${m[3]}/`} target="_blank" rel="noreferrer">
          PMID: {m[3]}
        </a>,
      );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ source }: { source: string }) {
  const paragraphs = source.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="gl-text-sm" style={{ margin: i < paragraphs.length - 1 ? "0 0 8px" : 0, color: "var(--text-secondary)" }}>
          {renderInline(p, `p${i}`)}
        </p>
      ))}
    </>
  );
}

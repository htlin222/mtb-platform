import { useState, type ReactNode } from "react";

// Blurs PHI (e.g. a patient name) until clicked — a light privacy affordance for
// projecting a case in a room. Click toggles reveal.
export default function Redacted({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={`gl-redacted${revealed ? " revealed" : ""}`}
      title={revealed ? "Click to hide" : "Click to reveal"}
      role="button"
      tabIndex={0}
      aria-pressed={revealed}
      onClick={() => setRevealed((r) => !r)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRevealed((r) => !r); } }}
    >
      {children}
    </span>
  );
}

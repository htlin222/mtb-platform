// ---------------------------------------------------------------------------
// Presentation logic. Colour is reserved for a SINGLE clinical signal —
// ESCAT actionability — plus report status, positive biomarkers and
// FDA-approved therapies. Everything else stays neutral.
// Variants map to GitLab Pajamas badge variants.
// ---------------------------------------------------------------------------
import type { EscatTier, ReportStatus, Variant, Biomarkers } from "../types";
import type { BadgeVariant } from "../components/gl";

// ── ESCAT: the one ordinal signal that carries colour ──────────────────────
export const ESCAT_META: Record<
  EscatTier,
  { variant: BadgeVariant; label: string; short: string }
> = {
  I: { variant: "success", label: "Ready for routine clinical use", short: "Tier I" },
  II: { variant: "info", label: "Investigational, trial-enabling", short: "Tier II" },
  III: { variant: "warning", label: "Evidence in other tumour types", short: "Tier III" },
  IV: { variant: "muted", label: "Preclinical evidence", short: "Tier IV" },
  X: { variant: "neutral", label: "No actionability evidence", short: "Tier X" },
};

export const ESCAT_ORDER: EscatTier[] = ["I", "II", "III", "IV", "X"];

export function isActionable(v: Variant): boolean {
  return v.escat === "I" || v.escat === "II";
}

// ── Report status ──────────────────────────────────────────────────────────
export const STATUS_META: Record<
  ReportStatus,
  { variant: BadgeVariant; label: string }
> = {
  processing: { variant: "muted", label: "In progress" },
  "pending-review": { variant: "warning", label: "Pending review" },
  reviewed: { variant: "info", label: "Reviewed" },
  signed: { variant: "success", label: "Signed off" },
};

// ── Biomarker: highlight only the actionable-positive state ────────────────
export function biomarkerPositive(kind: "tmb" | "msi" | "hrd", b: Biomarkers): boolean {
  if (kind === "tmb") return b.tmbClass === "TMB-High";
  if (kind === "msi") return b.msi === "MSI-H";
  return b.hrdStatus.toLowerCase().includes("positive");
}

// OncoKB level → concise plain-language sense (neutral text, not colour)
export function levelSense(level: string | null): string {
  if (!level) return "";
  const n = level.replace("LEVEL_", "");
  const map: Record<string, string> = {
    "1": "FDA-recognised biomarker",
    "2": "Standard-care biomarker",
    "3A": "Compelling clinical evidence",
    "3B": "Evidence in another indication",
    "4": "Compelling biological evidence",
    R1: "Standard-care resistance",
    R2: "Investigational resistance",
  };
  return map[n] ?? `Level ${n}`;
}

export const KIND_LABEL: Record<Variant["kind"], string> = {
  mutation: "Mutation",
  cna: "Copy number",
  fusion: "Fusion",
};

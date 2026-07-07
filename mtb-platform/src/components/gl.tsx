import type { ReactNode, CSSProperties } from "react";

// ── Badge ──────────────────────────────────────────────────────────────────
export type BadgeVariant =
  | "neutral" | "muted" | "info" | "success" | "warning" | "danger" | "tier";

export function GlBadge({
  variant = "neutral",
  children,
  title,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={`gl-badge gl-badge-${variant}`} title={title}>
      {children}
    </span>
  );
}

export function GlCount({ value, active }: { value: number; active?: boolean }) {
  return <span className={`gl-count${active ? " gl-count-active" : ""}`}>{value}</span>;
}

// ── Card ────────────────────────────────────────────────────────────────────
export function GlCard({
  header,
  children,
  style,
}: {
  header?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="gl-card" style={style}>
      {header && <div className="gl-card-header">{header}</div>}
      <div className="gl-card-body">{children}</div>
    </div>
  );
}

// ── Link button (navigation styled as link) ─────────────────────────────────
export function GlLinkButton({
  children,
  onClick,
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button type="button" className="gl-link-button" onClick={onClick} style={style}>
      {children}
    </button>
  );
}

// ── Icons (minimal inline set; GitLab-style 16px) ───────────────────────────
type IconProps = { size?: number };
const svg = (size: number, path: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    {path}
  </svg>
);

export const SearchIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M10.68 11.74a6 6 0 1 1 1.06-1.06l2.79 2.79a.75.75 0 1 1-1.06 1.06l-2.79-2.79ZM11 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />);
export const ChevronRightIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />);
export const ExternalLinkIcon = ({ size = 12 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M9 1.5a.75.75 0 0 0 0 1.5h2.44L6.22 8.22a.75.75 0 0 0 1.06 1.06L12.5 4.06V6.5a.75.75 0 0 0 1.5 0v-4A.75.75 0 0 0 13.25 1.5H9ZM3.5 3A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V9a.75.75 0 0 0-1.5 0v3.5h-8v-8H7A.75.75 0 0 0 7 3H3.5Z" />);
export const BeakerIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M6 1.5a.75.75 0 0 0 0 1.5v3.4L2.7 11.6A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.3-2.4L10 6.4V3a.75.75 0 0 0 0-1.5H6Zm1.5 1.5h1v3.6a.75.75 0 0 0 .12.4L10.4 11h-4.8L7.38 7a.75.75 0 0 0 .12-.4V3Z" />);
export const PulseIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M6 2.25a.75.75 0 0 1 .71.5l2.36 6.68 1.02-2.55a.75.75 0 0 1 .7-.47h3.46a.75.75 0 0 1 0 1.5h-2.96l-1.6 4a.75.75 0 0 1-1.4-.03L6.02 5.4 4.7 8.53a.75.75 0 0 1-.69.47H.75a.75.75 0 0 1 0-1.5h2.76l1.8-4.28a.75.75 0 0 1 .69-.47Z" />);
export const ScaleIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75V3H12a.75.75 0 0 1 0 1.5h-.36l1.82 4.55a.75.75 0 0 1-.2.85C12.6 10.4 11.83 10.75 11 10.75s-1.6-.35-2.26-.9a.75.75 0 0 1-.2-.85L10.36 4.5H8.75v8H11a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1 0-1.5h2.25v-8H5.64l1.82 4.55a.75.75 0 0 1-.2.85c-.66.55-1.43.9-2.26.9s-1.6-.35-2.26-.9a.75.75 0 0 1-.2-.85L4.36 4.5H4A.75.75 0 0 1 4 3h3.25V1.75A.75.75 0 0 1 8 1Z" />);
export const BookIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M3 2.75A1.75 1.75 0 0 1 4.75 1H13a.75.75 0 0 1 .75.75v9.5A.75.75 0 0 1 13 12H4.75a.25.25 0 0 0 0 .5H13a.75.75 0 0 1 0 1.5H4.75A1.75 1.75 0 0 1 3 12.25v-9.5ZM12.25 2.5H4.75a.25.25 0 0 0-.25.25v7.55c.08-.03.16-.05.25-.05h7.5V2.5Z" />);
export const ListIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M2 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.75-1.75a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5ZM3 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />);
export const PersonIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.9 0-5.25 1.68-5.25 3.75 0 .41.34.75.75.75h9c.41 0 .75-.34.75-.75 0-2.07-2.35-3.75-5.25-3.75Z" />);

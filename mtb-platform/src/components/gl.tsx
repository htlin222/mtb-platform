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
export const CheckIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L6.75 10.19l5.97-5.97a.75.75 0 0 1 1.06 0Z" />);
export const DocIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M3 2.75C3 1.78 3.78 1 4.75 1h4.44c.46 0 .9.18 1.24.51l2.06 2.06c.33.33.51.78.51 1.24v7.44c0 .97-.78 1.75-1.75 1.75h-6.5C3.78 14 3 13.22 3 12.25v-9.5Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .14.11.25.25.25h6.5a.25.25 0 0 0 .25-.25V5H9.5a.75.75 0 0 1-.75-.75V2.5H4.75Z" />);
export const CommentIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M1.5 3.25C1.5 2.56 2.06 2 2.75 2h10.5c.69 0 1.25.56 1.25 1.25v7.5c0 .69-.56 1.25-1.25 1.25H7.8l-2.72 2.4A.75.75 0 0 1 4 13.83V12H2.75c-.69 0-1.25-.56-1.25-1.25v-7.5Z" />);
export const TagIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M1.75 1.5a.25.25 0 0 0-.25.25v5.4c0 .06.03.13.07.17l6.5 6.5a.25.25 0 0 0 .36 0l5.4-5.4a.25.25 0 0 0 0-.36l-6.5-6.5a.25.25 0 0 0-.17-.07h-5.4ZM4.5 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />);
export const UploadIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .53.22l3 3a.75.75 0 0 1-1.06 1.06L8.75 3.56v6.69a.75.75 0 0 1-1.5 0V3.56L5.53 5.28a.75.75 0 0 1-1.06-1.06l3-3A.75.75 0 0 1 8 1ZM2.75 10a.75.75 0 0 1 .75.75v1.75h9V10.75a.75.75 0 0 1 1.5 0v2.25c0 .55-.45 1-1 1H3.25c-.55 0-1-.45-1-1v-2.25A.75.75 0 0 1 2.75 10Z" />);
export const ServerIcon = ({ size = 16 }: IconProps) =>
  svg(size, <path fillRule="evenodd" d="M2 3.25C2 2.56 2.56 2 3.25 2h9.5c.69 0 1.25.56 1.25 1.25v2.5c0 .69-.56 1.25-1.25 1.25h-9.5C2.56 7 2 6.44 2 5.75v-2.5Zm2 1.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM2 10.25C2 9.56 2.56 9 3.25 9h9.5c.69 0 1.25.56 1.25 1.25v2.5c0 .69-.56 1.25-1.25 1.25h-9.5C2.56 14 2 13.44 2 12.75v-2.5Zm2 1.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />);

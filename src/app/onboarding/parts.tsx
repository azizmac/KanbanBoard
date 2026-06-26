// Shared presentational bits for the onboarding tour. Ported from the design
// reference (design_handoff_onboarding) — inline styles → Tailwind + var(--color-*).
// Prototype-only chrome tokens (--terracotta, --btn-*, --tip-*, --device, --chrome-*)
// are defined locally on .ob-root in OnboardingClient, not in globals.css.

import type { CSSProperties, ReactNode } from "react";

/** Fixed initials colors from the reference (consistent people across screens). */
export const AV = {
  ds: { bg: "#D6ECFF", fg: "#1D6FD6" }, // Дмитрий Соколов
  mv: { bg: "#EADCFB", fg: "#6D28D9" }, // Мария Власова
  ak: { bg: "#F2D9CC", fg: "#C45A38" }, // Анна Климова (вы)
} as const;

/** Round initials chip (avatar stand-in). */
export function Initials({
  children,
  bg,
  fg,
  size = 28,
  font,
  className = "",
  style,
}: {
  children: ReactNode;
  bg: string;
  fg: string;
  size?: number;
  font?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-semibold ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: font ?? Math.round(size * 0.36), ...style }}
    >
      {children}
    </span>
  );
}

/** Section header above each step's device mockups. */
export function StepHeader({
  step,
  kicker,
  title,
  children,
}: {
  step: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="text-left">
      <div className="mb-[7px] font-mono text-[11px] font-medium tracking-[0.08em] text-[var(--color-accent)]">
        ШАГ {step} · {kicker}
      </div>
      <h2 className="mb-[5px] text-[23px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">{title}</h2>
      <p className="max-w-[680px] text-[14px] leading-[1.5] text-[var(--color-muted)]">{children}</p>
    </div>
  );
}

/** One step: fade-in wrapper + header + centered desktop/mobile mockups row. */
export function Step({
  step,
  kicker,
  title,
  subtitle,
  children,
}: {
  step: string;
  kicker: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 [animation:obFade_.45s_ease_both]">
      <StepHeader step={step} kicker={kicker} title={title}>
        {subtitle}
      </StepHeader>
      <div className="flex flex-wrap items-start justify-center gap-[30px]">{children}</div>
    </div>
  );
}

/** 720px desktop "window" surface. */
export function DesktopCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="w-[720px] max-w-full flex-none">
      <div
        className={`overflow-hidden rounded-[14px] bg-[var(--color-surface)] shadow-[0_12px_36px_rgba(20,20,20,0.12)] ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

/** Browser top bar (traffic lights + optional URL pill). */
export function BrowserChrome({ url }: { url?: string }) {
  return (
    <div className="flex h-9 items-center gap-[7px] border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-3.5">
      <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#F0A8A0" }} />
      <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#F4D08A" }} />
      <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#9CD9A8" }} />
      {url && (
        <div className="ml-3 flex h-[21px] w-[280px] items-center gap-1.5 rounded-md border border-[var(--chrome-border)] bg-[var(--color-surface)] px-2.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2.4">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span className="font-mono text-[10.5px] text-[var(--color-faint)]">{url}</span>
        </div>
      )}
    </div>
  );
}

/** 300px phone bezel. Inner screen is `relative` for bottom-sheet overlays. */
export function PhoneFrame({
  children,
  height,
  screen = "bg-[var(--color-surface)]",
}: {
  children: ReactNode;
  height: number;
  /** Tailwind bg class for the screen surface (board/composer use canvas). */
  screen?: string;
}) {
  return (
    <div className="w-[300px] max-w-full flex-none">
      <div className="rounded-[40px] bg-[var(--device)] p-2.5 shadow-[0_18px_44px_rgba(20,20,20,0.2)]">
        <div className={`relative flex flex-col overflow-hidden rounded-[30px] ${screen}`} style={{ height }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Dark coachmark bubble. Pass an arrow element as children for the pointer. */
export function Tip({
  title,
  body,
  className = "",
  style,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-[13px] bg-[var(--tip-bg)] px-[15px] py-[13px] shadow-[0_14px_34px_rgba(0,0,0,0.3)] ${className}`}
      style={style}
    >
      <div className="flex items-start gap-[9px]">
        <span
          className="mt-1 h-[9px] w-[9px] flex-none rounded-full"
          style={{ background: "#8579F2", boxShadow: "0 0 0 4px rgba(133,121,242,.25)" }}
        />
        <div>
          <div className="text-[13px] font-semibold leading-[1.3] text-[var(--tip-fg)]">{title}</div>
          <div className="mt-[3px] text-[12px] leading-[1.4] text-[var(--tip-sub)]">{body}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Telegram paper-plane glyph. */
export function TelegramGlyph({ size = 22, fill = "#fff" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="M21.94 4.58a1.4 1.4 0 0 0-1.45-.2L3.4 11.1c-1.06.43-1.04 1.95.03 2.35l4.13 1.54 1.6 5.02a1 1 0 0 0 1.62.45l2.42-2.18 4.43 3.26a1.4 1.4 0 0 0 2.2-.86l3.07-14.6a1.4 1.4 0 0 0-.49-1.5z" />
    </svg>
  );
}

/** Calendar glyph used for due dates. */
export function CalendarGlyph({ size = 14, stroke = "var(--color-muted)" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Plus glyph used on "create" buttons. */
export function PlusGlyph({ size = 17, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Check glyph. */
export function CheckGlyph({ size = 14, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.6">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

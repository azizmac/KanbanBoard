"use client";

import { useEffect, useRef, useState } from "react";

type Pref = "light" | "dark" | "system";

function applyTheme(pref: Pref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function useThemePref(): [Pref, (p: Pref) => void] {
  const [pref, setPref] = useState<Pref>("system");
  useEffect(() => {
    const saved = (localStorage.getItem("theme-pref") as Pref) || "system";
    setPref(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("theme-pref") || "system") === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const update = (p: Pref) => {
    localStorage.setItem("theme-pref", p);
    setPref(p);
    applyTheme(p);
  };
  return [pref, update];
}

const OPTIONS: { key: Pref; label: string; hint?: string; icon: React.ReactNode }[] = [
  {
    key: "light",
    label: "Светлая",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    key: "dark",
    label: "Тёмная",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
  {
    key: "system",
    label: "Системная",
    hint: "как в ОС",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
];

/** Round icon button + popover, for the slim sidebar. */
export function ThemeToggle() {
  const [pref, setPref] = useThemePref();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Оформление"
        className="grid h-10 w-10 place-items-center rounded-xl text-[#86847E] transition hover:bg-[#2E2E2B]/60 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-0 left-[52px] z-50 w-[210px] rounded-[14px] border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[0_10px_30px_rgba(20,20,20,0.18)]">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            Тема оформления
          </div>
          {OPTIONS.map((o) => {
            const active = pref === o.key;
            return (
              <button
                key={o.key}
                onClick={() => {
                  setPref(o.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] transition ${
                  active
                    ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-line)]"
                }`}
              >
                <span className={active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}>{o.icon}</span>
                <span className="flex-1">
                  {o.label}
                  {o.hint && <span className="ml-1.5 text-[11.5px] text-[var(--color-faint)]">{o.hint}</span>}
                </span>
                {active && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline segmented control, for the profile / mobile. */
export function ThemeSegment() {
  const [pref, setPref] = useThemePref();
  return (
    <div>
      <div className="flex rounded-[11px] bg-[var(--color-line)] p-1">
        {OPTIONS.map((o) => {
          const active = pref === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setPref(o.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-1.5 text-[13px] font-medium transition ${
                active
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(20,20,20,0.08)]"
                  : "text-[var(--color-muted)]"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11.5px] text-[var(--color-faint)]">Системная следует настройкам устройства.</p>
    </div>
  );
}

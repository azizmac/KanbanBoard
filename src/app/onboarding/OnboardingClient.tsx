"use client";

import { useCallback, useEffect, useReducer, useSyncExternalStore, useTransition } from "react";
import { LogoMark } from "@/components/Logo";
import { completeOnboarding } from "./actions";
import { StepAccess } from "./steps/StepAccess";
import { StepBoards } from "./steps/StepBoards";
import { StepCreate } from "./steps/StepCreate";
import { StepDone } from "./steps/StepDone";
import { StepLogin } from "./steps/StepLogin";
import { StepNotify } from "./steps/StepNotify";
import { StepTasks } from "./steps/StepTasks";

const LAST = 5; // index of the final interactive step (Create) → done

type State = { step: number; done: boolean };
type Action = { type: "next" | "back" | "restart" } | { type: "goto"; step: number };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "next":
      if (s.done) return s;
      return s.step >= LAST ? { ...s, done: true } : { step: s.step + 1, done: false };
    case "back":
      if (s.done) return { ...s, done: false };
      return { step: Math.max(0, s.step - 1), done: false };
    case "restart":
      return { step: 0, done: false };
    case "goto":
      return { step: a.step, done: false };
  }
}

/** Light/dark flip wired to the app's shared theme storage (theme-pref + data-theme).
 *  Reads data-theme via useSyncExternalStore so it stays in sync without a setState-in-effect. */
function useThemeFlip() {
  const theme = useSyncExternalStore(
    (onChange) => {
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => obs.disconnect();
    },
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light" as const,
  );
  const flip = useCallback(() => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme-pref", next);
    } catch {
      /* ignore */
    }
  }, []);
  return [theme, flip] as const;
}

export function OnboardingClient({ firstName }: { firstName: string }) {
  const [{ step, done }, dispatch] = useReducer(reducer, { step: 0, done: false });
  const [pending, startTransition] = useTransition();
  const [theme, flipTheme] = useThemeFlip();

  const next = useCallback(() => dispatch({ type: "next" }), []);
  const back = useCallback(() => dispatch({ type: "back" }), []);

  // ←/→ navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  const finish = () => startTransition(() => void completeOnboarding());

  const canBack = done || step > 0;
  const counter = done ? "Готово" : `0${step + 1} / 06`;

  return (
    <div className="ob-root flex min-h-screen flex-col gap-5 bg-[var(--page)] px-4 pb-6 pt-[26px] font-sans text-[var(--color-ink)] transition-colors sm:px-[30px]">
      <ObStyles />

      {/* top bar */}
      <header className="mx-auto flex w-[1060px] max-w-full items-center justify-between">
        <div className="flex items-center gap-[11px]">
          <LogoMark size={28} />
          <span className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">Поток</span>
          <span className="hidden font-mono text-[10.5px] text-[var(--color-muted)] sm:inline-block rounded-full border border-[var(--color-border-card)] bg-[var(--color-surface)] px-[9px] py-[3px]">
            Знакомство с продуктом
          </span>
        </div>
        <div className="flex items-center gap-[13px]">
          <span className="hidden font-mono text-[11px] text-[var(--color-faint)] md:inline">← → для навигации</span>
          <button
            onClick={flipTheme}
            title="Сменить тему"
            aria-label="Сменить тему"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-[var(--color-border-card)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* stage */}
      <main className="relative mx-auto flex w-[1060px] max-w-full min-h-0 flex-1 flex-col">
        {!done && step === 0 && <StepLogin onNext={next} />}
        {!done && step === 1 && <StepAccess firstName={firstName} onNext={next} />}
        {!done && step === 2 && <StepBoards />}
        {!done && step === 3 && <StepTasks />}
        {!done && step === 4 && <StepNotify />}
        {!done && step === 5 && <StepCreate firstName={firstName} onNext={next} />}
        {done && (
          <StepDone onReplay={() => dispatch({ type: "restart" })} onFinish={finish} pending={pending} />
        )}
      </main>

      {/* footer nav */}
      <footer className="mx-auto flex w-[1060px] max-w-full items-center justify-between gap-4">
        <div className="flex flex-1 justify-start">
          {canBack && (
            <button
              onClick={back}
              className="flex h-11 items-center gap-[7px] rounded-[12px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-[18px] text-[13.5px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-warm)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Назад
            </button>
          )}
        </div>

        <div className="flex flex-none items-center gap-[9px]">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const active = !done && i === step;
            const filled = done || i < step;
            return (
              <button
                key={i}
                onClick={() => dispatch({ type: "goto", step: i })}
                aria-label={`Шаг ${i + 1}`}
                aria-current={active}
                className="h-2 w-[26px] rounded-full transition-[background,width] duration-300"
                style={{ background: active ? "var(--color-ink)" : filled ? "var(--terracotta)" : "var(--color-border-input)" }}
              />
            );
          })}
          <span className="ml-1.5 font-mono text-[11px] text-[var(--color-faint)]">{counter}</span>
        </div>

        <div className="flex flex-1 justify-end">
          {!done && step < LAST && (
            <button
              onClick={next}
              className="flex h-11 items-center gap-[7px] rounded-[12px] bg-[var(--btn-bg)] px-[22px] text-[13.5px] font-semibold text-[var(--btn-fg)] transition-colors hover:bg-[var(--btn-hover)]"
            >
              Далее
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
          {!done && step === LAST && (
            <button
              onClick={next}
              className="flex h-11 items-center gap-[7px] rounded-[12px] px-[22px] text-[13.5px] font-semibold text-white transition-colors hover:brightness-95"
              style={{ background: "var(--terracotta)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Создать задачу
            </button>
          )}
          {done && (
            <button
              onClick={() => dispatch({ type: "restart" })}
              className="flex h-11 items-center gap-[7px] rounded-[12px] bg-[var(--btn-bg)] px-[22px] text-[13.5px] font-semibold text-[var(--btn-fg)] transition-colors hover:bg-[var(--btn-hover)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8" />
                <path d="M3 4v4h4" />
              </svg>
              Заново
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Prototype-only chrome tokens (kept out of globals.css) + entrance animations. */
function ObStyles() {
  return (
    <style>{`
.ob-root{
  --page:#e7e5df; --device:#1b1b1a; --chrome-bg:#f2f0eb; --chrome-border:#e6e3dc;
  --tip-bg:#1b1b1a; --tip-fg:#ffffff; --tip-sub:#b6b3ac;
  --btn-bg:#1b1b1a; --btn-fg:#ffffff; --btn-hover:#000000;
  --terracotta:#d97757; --chip-neutral:#f2f0eb;
}
html[data-theme="dark"] .ob-root{
  --page:#0e0d0c; --device:#000000; --chrome-bg:#2a2723; --chrome-border:#322e29;
  --tip-bg:#2f2b27; --tip-fg:#f4f2ec; --tip-sub:#a8a39a;
  --btn-bg:#f4f2ec; --btn-fg:#1b1b1a; --btn-hover:#ffffff;
  --chip-neutral:#2a2723;
}
@keyframes obFade{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
@keyframes obFloatA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-24px,18px) scale(1.08)}}
@keyframes obFloatB{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-16px) scale(1.06)}}
@keyframes obSheen{0%{transform:translateX(-130%) skewX(-18deg)}55%,100%{transform:translateX(260%) skewX(-18deg)}}
@keyframes obDrop{0%{opacity:0;transform:translateY(-10px) scale(.97)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes obPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes obTilt{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-6px)}}
@keyframes obRing{0%{box-shadow:0 0 0 0 rgba(85,70,224,.35)}100%{box-shadow:0 0 0 16px rgba(85,70,224,0)}}
@media (prefers-reduced-motion: reduce){
  .ob-root *{animation:none !important}
}
`}</style>
  );
}

import type { ReactNode } from "react";
import { BrowserChrome, CheckGlyph, DesktopCard, PhoneFrame, Step } from "../parts";

/** Terracotta app-icon tile with the three white columns + soft glow. */
function BrandTile({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, background: "var(--terracotta)", boxShadow: "0 8px 20px rgba(217,119,87,.36)" }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 100 100" fill="none">
        <rect x="14" y="56" width="18" height="34" rx="6" fill="#fff" opacity=".55" />
        <rect x="40" y="38" width="18" height="52" rx="6" fill="#fff" opacity=".82" />
        <rect x="66" y="20" width="18" height="70" rx="6" fill="#fff" />
      </svg>
    </div>
  );
}

const FEATURES: { title: string; sub: string; icon: ReactNode }[] = [
  {
    title: "Доски и колонки",
    sub: "Вся работа команды наглядно",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
        <rect x="3" y="3" width="7" height="18" rx="1.5" />
        <rect x="14" y="3" width="7" height="11" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "Задачи и обсуждения",
    sub: "Комментарии, упоминания, файлы",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Уведомления в Telegram",
    sub: "Ничего не потеряется",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

function SuccessLine({ size = 14, text = "Доступ к доскам открыт" }: { size?: number; text?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-success)]">
      <CheckGlyph size={size} stroke="currentColor" />
      {text}
    </div>
  );
}

export function StepAccess({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  const name = firstName || "коллега";
  return (
    <Step
      step="02"
      kicker="ДОСТУП"
      title="Добро пожаловать в Поток"
      subtitle="Администратор открыл вам доступ к доскам команды. Коротко покажем, как устроена работа: доски, задачи и уведомления."
    >
      {/* desktop */}
      <DesktopCard>
        <BrowserChrome />
        <div className="relative h-[524px] bg-[var(--color-canvas)]">
          {/* blurred board */}
          <div className="absolute inset-0 flex gap-3.5 p-6 opacity-55 blur-[5px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-full flex-1 rounded-[12px] bg-[var(--color-surface)]" />
            ))}
          </div>
          <div className="absolute inset-0" style={{ background: "rgba(27,27,26,.32)" }} />
          {/* modal */}
          <div className="absolute inset-0 flex items-center justify-center p-[30px]">
            <div className="w-[440px] rounded-[20px] bg-[var(--color-surface)] px-[34px] pb-[30px] pt-[34px] shadow-[0_24px_60px_rgba(20,20,20,0.28)] [animation:obDrop_.5s_ease_both]">
              <div className="mb-5 flex items-center gap-[13px]">
                <BrandTile size={54} radius={15} />
                <div>
                  <div className="text-[21px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">С возвращением, {name}!</div>
                  <div className="mt-[3px]">
                    <SuccessLine />
                  </div>
                </div>
              </div>
              <div className="mb-6 flex flex-col gap-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex items-center gap-3">
                    <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-[var(--color-accent-soft)]">
                      {f.icon}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">{f.title}</div>
                      <div className="text-[12px] text-[var(--color-muted)]">{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={onNext}
                className="h-12 w-full rounded-[13px] bg-[var(--btn-bg)] text-[14.5px] font-semibold text-[var(--btn-fg)] transition-colors hover:bg-[var(--btn-hover)]"
              >
                Показать, как всё устроено
              </button>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={524} screen="bg-[var(--color-canvas)]">
        <div className="absolute inset-0 flex flex-col gap-2.5 p-[18px] opacity-50 blur-[4px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-[10px] bg-[var(--color-surface)]" />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "rgba(27,27,26,.34)" }} />
        <div className="absolute inset-x-0 bottom-0 rounded-[24px_24px_30px_30px] bg-[var(--color-surface)] px-[22px] pb-6 pt-[26px] [animation:obDrop_.5s_ease_both]">
          <div className="mb-4">
            <BrandTile size={50} radius={14} />
          </div>
          <div className="mb-[5px] text-[19px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">С возвращением, {name}!</div>
          <div className="mb-[18px]">
            <SuccessLine size={13} />
          </div>
          <button
            onClick={onNext}
            className="h-[46px] w-full rounded-[12px] bg-[var(--btn-bg)] text-[14px] font-semibold text-[var(--btn-fg)]"
          >
            Начать знакомство
          </button>
        </div>
      </PhoneFrame>
    </Step>
  );
}

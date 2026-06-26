import { DesktopCard, PhoneFrame, Step, TelegramGlyph } from "../parts";

function Toggle({ on, w = 44, h = 26, knob = 20 }: { on: boolean; w?: number; h?: number; knob?: number }) {
  const inset = (h - knob) / 2;
  return (
    <div
      className={`relative flex-none rounded-full ${on ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-input)]"}`}
      style={{ width: w, height: h }}
    >
      <span
        className="absolute rounded-full bg-white"
        style={{ width: knob, height: knob, top: inset, [on ? "right" : "left"]: inset }}
      />
    </div>
  );
}

function Row({ title, sub, on }: { title: string; sub: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[13px] border border-[var(--color-border-card)] px-[17px] py-[15px]">
      <div>
        <div className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</div>
        <div className="mt-0.5 text-[12px] text-[var(--color-muted)]">{sub}</div>
      </div>
      <Toggle on={on} />
    </div>
  );
}

/** Small terracotta avatar used inside the Telegram message bubble. */
function TgAvatar({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-full" style={{ width: size, height: size, background: "#D97757" }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 100 100" fill="none">
        <rect x="14" y="56" width="18" height="34" rx="6" fill="#fff" opacity=".6" />
        <rect x="40" y="38" width="18" height="52" rx="6" fill="#fff" opacity=".82" />
        <rect x="66" y="20" width="18" height="70" rx="6" fill="#fff" />
      </svg>
    </div>
  );
}

export function StepNotify() {
  return (
    <Step
      step="05"
      kicker="УВЕДОМЛЕНИЯ"
      title="Уведомления в Telegram"
      subtitle="Поток присылает уведомления туда, где вы и так есть — в Telegram. Упоминания, назначения и дедлайны не потеряются."
    >
      {/* desktop */}
      <DesktopCard className="flex h-[560px]">
        <div className="flex min-w-0 flex-1 flex-col px-[34px] py-[30px]">
          <h3 className="mb-1 text-[19px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Уведомления</h3>
          <p className="mb-6 text-[13px] text-[var(--color-muted)]">Выберите, о чём сообщать. Канал доставки — Telegram.</p>
          <div className="flex flex-col gap-3">
            <Row title="Вас упомянули через @" sub="Когда коллега пишет вам в комментарии" on />
            <Row title="Назначена задача" sub="Когда задачу повесили на вас" on />
            <Row title="Приближается дедлайн" sub="За день до срока задачи" on={false} />
          </div>
          <div className="mt-auto flex items-center gap-[9px] rounded-[11px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-3.5 py-3">
            <TelegramGlyph size={17} fill="#229ED9" />
            <span className="text-[12.5px] text-[var(--color-muted)]">
              Telegram подключён — <span className="font-semibold text-[var(--color-ink)]">@anna_k</span>
            </span>
          </div>
        </div>
        {/* telegram preview — constant brand surface */}
        <div
          className="flex w-[266px] flex-none flex-col justify-center gap-3.5 border-l border-[var(--color-line)] px-5 py-[26px]"
          style={{ background: "linear-gradient(160deg,#5B6B7E,#3E4A57)" }}
        >
          <div className="mb-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "rgba(255,255,255,.6)" }}>
            Так выглядит в Telegram
          </div>
          <div className="rounded-[14px_14px_14px_4px] bg-white px-[15px] py-[13px] shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
            <div className="mb-2 flex items-center gap-2">
              <TgAvatar />
              <span className="text-[12.5px] font-bold" style={{ color: "#1B1B1A" }}>Поток</span>
            </div>
            <div className="text-[12.5px] leading-[1.45]" style={{ color: "#1B1B1A" }}>
              <span className="font-semibold">Мария Власова</span> упомянула вас в «Интеграция ЮKassa»
            </div>
            <div className="mt-2 text-[11.5px] font-semibold" style={{ color: "#5546E0" }}>Открыть задачу →</div>
          </div>
          <div className="rounded-[14px_14px_14px_4px] bg-white px-3.5 py-[11px] opacity-85 shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
            <div className="text-[12px] leading-[1.4]" style={{ color: "#1B1B1A" }}>
              ⏰ Завтра дедлайн: <span className="font-semibold">«Пуш-уведомления»</span>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={560}>
        <div className="flex-none border-b border-[var(--color-line)] px-[18px] pb-3.5 pt-[18px]">
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Уведомления</h3>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">Канал доставки — Telegram</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 py-[15px]">
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--color-border-card)] px-3.5 py-[13px]">
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">Упоминания @</div>
            <Toggle on w={40} h={24} knob={18} />
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--color-border-card)] px-3.5 py-[13px]">
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">Назначена задача</div>
            <Toggle on w={40} h={24} knob={18} />
          </div>
          <div className="mt-1.5 rounded-[13px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-[13px] py-3 shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
            <div className="mb-1.5 flex items-center gap-[7px]">
              <TgAvatar size={22} />
              <span className="text-[11.5px] font-bold text-[var(--color-ink)]">Поток · Telegram</span>
            </div>
            <div className="text-[12px] leading-[1.4] text-[var(--color-ink)]">
              <span className="font-semibold">Мария</span> упомянула вас в задаче
            </div>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <TelegramGlyph size={15} fill="#229ED9" />
          <span className="text-[11.5px] text-[var(--color-muted)]">
            Подключён — <span className="font-semibold text-[var(--color-ink)]">@anna_k</span>
          </span>
        </div>
      </PhoneFrame>
    </Step>
  );
}

import { LogoMark } from "@/components/Logo";
import { BrowserChrome, DesktopCard, PhoneFrame, Step, TelegramGlyph } from "../parts";

const STATS = [
  { value: "12", label: "досок" },
  { value: "840", label: "задач закрыто" },
  { value: "9", label: "в команде" },
];

/** Drifting glow orb behind the dark brand panel. */
function Orb({ color, anim, className }: { color: string; anim: string; className: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${anim} ${className}`}
      style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
    />
  );
}

/** Animated sheen sweeping across a button. */
function Sheen() {
  return (
    <span
      className="absolute left-0 top-0 h-full w-2/5 [animation:obSheen_3.4s_ease-in-out_infinite]"
      style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)" }}
    />
  );
}

export function StepLogin({ onNext }: { onNext: () => void }) {
  return (
    <Step
      step="01"
      kicker="ВХОД"
      title="Вход без паролей"
      subtitle="Поток использует Telegram вместо логинов и паролей. Один тап — и вы внутри; мы получаем только имя и аватар."
    >
      {/* desktop */}
      <DesktopCard>
        <BrowserChrome url="potok.app/login" />
        <div className="flex h-[524px]">
          {/* brand panel — intentionally dark in both themes */}
          <div className="relative flex w-[46%] flex-none flex-col justify-between overflow-hidden px-8 py-[34px]" style={{ background: "#1B1B1A" }}>
            <Orb color="#D97757" anim="[animation:obFloatA_9s_ease-in-out_infinite]" className="-right-[70px] -top-[50px] h-[230px] w-[230px] opacity-50" />
            <Orb color="#7B5CE6" anim="[animation:obFloatB_11s_ease-in-out_infinite]" className="-left-[60px] -bottom-[50px] h-[200px] w-[200px] opacity-40" />
            <div className="relative flex items-center gap-2.5">
              <LogoMark size={26} tone="dark" />
              <span className="text-[17px] font-bold tracking-[-0.03em] text-white">Поток</span>
            </div>
            <div className="relative">
              <h3 className="mb-2.5 text-[23px] font-bold leading-[1.18] tracking-[-0.03em] text-white">
                Доски, задачи и команда — в одном потоке.
              </h3>
              <p className="text-[13px] leading-[1.5]" style={{ color: "#9A988F" }}>
                Канбан для команд, которые ценят ясность.
              </p>
            </div>
            <div className="relative flex gap-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-[20px] font-bold text-white">{s.value}</div>
                  <div className="text-[11.5px]" style={{ color: "#86847E" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* form panel */}
          <div className="flex flex-1 flex-col justify-center bg-[var(--color-surface)] px-[38px] py-10">
            <div className="mb-[22px] flex items-center gap-[9px]">
              <LogoMark size={24} />
            </div>
            <h3 className="mb-2 text-[24px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">Вход в Поток</h3>
            <p className="mb-6 text-[14px] leading-[1.5] text-[var(--color-muted)]">
              Используйте свой Telegram-аккаунт — никаких паролей.
            </p>
            <button
              onClick={onNext}
              className="relative flex h-[54px] items-center justify-center gap-[11px] overflow-hidden rounded-[14px] text-[15.5px] font-semibold text-white transition-colors hover:brightness-95"
              style={{ background: "#229ED9" }}
            >
              <Sheen />
              <TelegramGlyph size={22} />
              Войти через Telegram
            </button>
            <div className="mt-[22px] flex items-start gap-2.5 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-3.5 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" className="mt-px flex-none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[12.5px] leading-[1.5] text-[var(--color-muted)]">
                Доступ к доскам выдаёт администратор после первого входа.
              </span>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={524}>
        <div className="relative flex h-[150px] flex-none flex-col justify-end overflow-hidden px-6 py-[22px]" style={{ background: "#1B1B1A" }}>
          <Orb color="#D97757" anim="[animation:obFloatA_9s_ease-in-out_infinite]" className="-right-10 -top-[30px] h-[150px] w-[150px] opacity-50" />
          <div className="relative mb-2.5 flex items-center gap-2">
            <LogoMark size={22} tone="dark" />
            <span className="text-[16px] font-bold tracking-[-0.03em] text-white">Поток</span>
          </div>
          <p className="relative text-[13.5px] font-medium leading-[1.35]" style={{ color: "#C9C7C0" }}>
            Доски, задачи и команда — в одном потоке.
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center bg-[var(--color-surface)] px-[22px] py-[26px]">
          <h3 className="mb-[7px] text-[20px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">Вход в Поток</h3>
          <p className="mb-5 text-[13px] leading-[1.45] text-[var(--color-muted)]">Через Telegram, без паролей.</p>
          <button
            onClick={onNext}
            className="relative flex h-[50px] items-center justify-center gap-[9px] overflow-hidden rounded-[13px] text-[14.5px] font-semibold text-white"
            style={{ background: "#229ED9" }}
          >
            <Sheen />
            <TelegramGlyph size={19} />
            Войти через Telegram
          </button>
          <p className="mt-4 text-center text-[11.5px] leading-[1.45] text-[var(--color-faint)]">
            Доступ к доскам откроет администратор.
          </p>
        </div>
      </PhoneFrame>
    </Step>
  );
}

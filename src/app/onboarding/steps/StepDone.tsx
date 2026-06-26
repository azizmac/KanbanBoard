import { CheckGlyph } from "../parts";

function Orb({ color, anim, className }: { color: string; anim: string; className: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${anim} ${className}`}
      style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
    />
  );
}

export function StepDone({
  onReplay,
  onFinish,
  pending,
}: {
  onReplay: () => void;
  onFinish: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex min-h-[560px] items-center justify-center [animation:obFade_.45s_ease_both]">
      <div className="w-[560px] max-w-full overflow-hidden rounded-[22px] bg-[var(--color-surface)] text-center shadow-[0_24px_70px_rgba(20,20,20,0.16)]">
        {/* dark header */}
        <div className="relative overflow-hidden px-10 pb-[34px] pt-10" style={{ background: "#1B1B1A" }}>
          <Orb color="#D97757" anim="[animation:obFloatA_9s_ease-in-out_infinite]" className="-right-[50px] -top-10 h-[200px] w-[200px] opacity-50" />
          <Orb color="#7B5CE6" anim="[animation:obFloatB_11s_ease-in-out_infinite]" className="-left-10 -bottom-[50px] h-[180px] w-[180px] opacity-40" />
          <div
            className="relative mx-auto mb-[18px] flex h-[72px] w-[72px] items-center justify-center rounded-full [animation:obPop_.6s_ease_both]"
            style={{ background: "#17B26A", boxShadow: "0 10px 30px rgba(23,178,106,.4)" }}
          >
            <CheckGlyph size={38} stroke="#fff" />
          </div>
          <h2 className="relative mb-2 text-[25px] font-bold tracking-[-0.03em] text-white">Вы в потоке!</h2>
          <p className="relative text-[14px] leading-[1.5]" style={{ color: "#B6B3AC" }}>
            Онбординг завершён. Ваша первая задача уже на доске «Разработка платформы».
          </p>
        </div>
        {/* body */}
        <div className="px-10 pb-8 pt-[26px]">
          <div className="mb-[22px] flex items-center gap-[11px] rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-[15px] py-[13px] text-left">
            <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] border border-[var(--color-border-card)] bg-[var(--color-surface)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-muted)]" />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">Подготовить релиз 2.0</div>
              <div className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">Колонка «Бэклог» · приоритет высокий · 28 июня</div>
            </div>
            <span className="flex-none rounded-full bg-[var(--color-success-bg)] px-[9px] py-1 text-[10.5px] font-semibold text-[var(--color-success)]">Создана</span>
          </div>
          <div className="flex gap-[11px]">
            <button
              onClick={onReplay}
              disabled={pending}
              className="h-12 flex-none rounded-[13px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-5 text-[14px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-warm)] disabled:opacity-60"
            >
              Пройти заново
            </button>
            <button
              onClick={onFinish}
              disabled={pending}
              className="h-12 flex-1 rounded-[13px] bg-[var(--btn-bg)] text-[14.5px] font-semibold text-[var(--btn-fg)] transition-colors hover:bg-[var(--btn-hover)] disabled:opacity-70"
            >
              {pending ? "Открываем…" : "Перейти к доске →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

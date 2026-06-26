import type { ReactNode } from "react";
import { AV, CalendarGlyph, DesktopCard, Initials, PhoneFrame, Step, Tip } from "../parts";

function Label({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-faint)]">{children}</div>;
}

function Mention({ children }: { children: ReactNode }) {
  return <span className="rounded-[5px] bg-[var(--color-accent-soft)] px-[5px] py-px font-semibold text-[var(--color-accent)]">{children}</span>;
}

function SendButton({ size = 30, icon = 15 }: { size?: number; icon?: number }) {
  return (
    <span className="flex flex-none items-center justify-center rounded-[9px] bg-[var(--color-accent)]" style={{ width: size, height: size }}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
      </svg>
    </span>
  );
}

export function StepTasks() {
  return (
    <Step
      step="04"
      kicker="ЗАДАЧИ"
      title="Задачи и обсуждения"
      subtitle="Внутри карточки — описание, исполнитель, сроки и комментарии. Упоминайте коллег через @ и прикладывайте файлы."
    >
      {/* desktop */}
      <DesktopCard className="flex h-[560px]">
        {/* body */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-none border-b border-[var(--color-line)] px-[26px] pb-4 pt-[22px]">
            <div className="mb-[11px] flex items-center gap-[9px]">
              <span className="rounded-full bg-[var(--color-normal-bg)] px-[9px] py-[3px] text-[10.5px] font-semibold text-[var(--color-normal)]">Обычный</span>
              <span className="font-mono text-[11.5px] text-[var(--color-faint)]">#214 · Разработка платформы</span>
            </div>
            <h3 className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--color-ink)]">Интеграция ЮKassa</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-[26px] py-[18px]">
            <Label>Описание</Label>
            <p className="mb-[22px] mt-2 text-[13.5px] leading-[1.6] text-[var(--color-body)]">
              Подключить приём платежей через ЮKassa: создание счёта, обработка webhook о статусе и сохранение чеков в задаче.
            </p>
            <div className="mb-3">
              <Label>Обсуждение</Label>
            </div>
            <div className="mb-4 flex gap-[11px]">
              <Initials bg={AV.mv.bg} fg={AV.mv.fg} size={30} font={10.5}>МВ</Initials>
              <div>
                <div className="text-[13px] leading-[1.5] text-[var(--color-ink)]">
                  <span className="font-semibold">Мария Власова:</span> Документацию по webhook закинула, можно начинать. <Mention>@Дмитрий</Mention> подхватишь?
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--color-faint)]">14 минут назад</div>
              </div>
            </div>
            <div className="flex gap-[11px]">
              <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={30} font={10.5}>ДС</Initials>
              <div>
                <div className="text-[13px] leading-[1.5] text-[var(--color-ink)]">
                  <span className="font-semibold">Дмитрий Соколов:</span> Беру. Завтра будет первый черновик.
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--color-faint)]">6 минут назад</div>
              </div>
            </div>
          </div>
          <div className="relative flex-none border-t border-[var(--color-line)] px-[26px] py-3.5">
            <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--color-border-input)] px-3 py-2.5">
              <Initials bg={AV.ak.bg} fg={AV.ak.fg} size={26} font={9.5}>АК</Initials>
              <span className="flex-1 text-[13px] text-[var(--color-faint)]">Написать комментарий, @ — упомянуть…</span>
              <SendButton />
            </div>
            <Tip
              title="Обсуждайте прямо в задаче"
              body="Упоминайте коллег через @ — им придёт уведомление."
              className="absolute right-6 top-[-58px] z-[6] w-[236px]"
            >
              <div className="absolute bottom-[-7px] right-10 h-[14px] w-[14px] rotate-45 bg-[var(--tip-bg)]" />
            </Tip>
          </div>
        </div>
        {/* meta */}
        <div className="flex w-[212px] flex-none flex-col gap-5 border-l border-[var(--color-line)] bg-[var(--color-surface-warm)] px-5 py-[22px]">
          <div>
            <div className="mb-[9px]"><Label>Исполнитель</Label></div>
            <div className="flex items-center gap-[9px]">
              <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={28} font={10}>ДС</Initials>
              <span className="text-[13px] font-medium text-[var(--color-ink)]">Дмитрий Соколов</span>
            </div>
          </div>
          <div>
            <div className="mb-[9px]"><Label>Статус</Label></div>
            <span className="rounded-full bg-[var(--color-accent)] px-[11px] py-[5px] text-[12px] font-semibold text-white">В работе</span>
          </div>
          <div>
            <div className="mb-[9px]"><Label>Срок</Label></div>
            <div className="flex items-center gap-[7px] text-[13px] font-medium text-[var(--color-ink)]">
              <CalendarGlyph size={14} />24 июня
            </div>
          </div>
          <div>
            <div className="mb-[9px]"><Label>Файлы</Label></div>
            <div className="flex items-center gap-2 rounded-[9px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-2.5 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" className="flex-none">
                <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
              </svg>
              <span className="text-[11.5px] text-[var(--color-body)]">yookassa-api.pdf</span>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={560}>
        <div className="flex-none border-b border-[var(--color-line)] px-[18px] pb-[13px] pt-4">
          <div className="mb-[9px] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="rounded-full bg-[var(--color-normal-bg)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-normal)]">Обычный</span>
            <span className="font-mono text-[11px] text-[var(--color-faint)]">#214</span>
          </div>
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Интеграция ЮKassa</h3>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-[18px] py-[15px]">
          <p className="mb-4 text-[12.5px] leading-[1.55] text-[var(--color-body)]">
            Подключить приём платежей: счёт, webhook и сохранение чеков.
          </p>
          <div className="mb-2.5"><Label>Обсуждение</Label></div>
          <div className="mb-[13px] flex gap-[9px]">
            <Initials bg={AV.mv.bg} fg={AV.mv.fg} size={26} font={9.5}>МВ</Initials>
            <div className="text-[12px] leading-[1.45] text-[var(--color-ink)]">
              <span className="font-semibold">Мария:</span> Начинаем. <Mention>@Дмитрий</Mention> подхватишь?
            </div>
          </div>
          <div className="flex gap-[9px]">
            <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={26} font={9.5}>ДС</Initials>
            <div className="text-[12px] leading-[1.45] text-[var(--color-ink)]">
              <span className="font-semibold">Дмитрий:</span> Беру, завтра черновик.
            </div>
          </div>
        </div>
        <div className="flex-none border-t border-[var(--color-line)] px-4 py-3">
          <div className="flex items-center gap-2 rounded-[11px] border border-[var(--color-border-input)] px-[11px] py-[9px]">
            <span className="flex-1 text-[12px] text-[var(--color-faint)]">Комментарий, @ — упомянуть</span>
            <SendButton size={26} icon={13} />
          </div>
        </div>
      </PhoneFrame>
    </Step>
  );
}

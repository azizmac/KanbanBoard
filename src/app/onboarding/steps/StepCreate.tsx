import type { ReactNode } from "react";
import { CalendarGlyph, DesktopCard, Initials, PhoneFrame, PlusGlyph, Step } from "../parts";

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">{children}</div>;
}

function Field({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border-input)] px-3">{children}</div>
  );
}

const RING = "0 0 0 4px rgba(85,70,224,.1)";

export function StepCreate({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  const you = firstName || "Вы";
  return (
    <Step
      step="06"
      kicker="ПЕРВАЯ ЗАДАЧА"
      title="Создайте первую задачу"
      subtitle="Всё готово к работе. Заполните карточку — и она появится на доске. С этого начинается ваш поток."
    >
      {/* desktop */}
      <DesktopCard className="relative h-[560px]">
        {/* dim board */}
        <div className="absolute inset-0 flex gap-3 p-5 opacity-60 blur-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 rounded-[11px] bg-[var(--color-surface)]" />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "rgba(27,27,26,.3)" }} />
        {/* composer */}
        <div className="absolute inset-0 flex items-center justify-center p-[26px]">
          <div className="w-[480px] overflow-hidden rounded-[18px] bg-[var(--color-surface)] shadow-[0_24px_60px_rgba(20,20,20,0.3)] [animation:obDrop_.5s_ease_both]">
            <div className="flex items-center justify-between px-6 pt-5">
              <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Новая задача</h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <div className="px-6 pb-[22px] pt-[18px]">
              <input
                readOnly
                value="Подготовить релиз 2.0"
                className="mb-3 h-[46px] w-full rounded-[12px] border-[1.5px] border-[var(--color-accent)] bg-[var(--color-surface)] px-3.5 text-[15px] font-semibold text-[var(--color-ink)] outline-none"
                style={{ boxShadow: RING }}
              />
              <textarea
                readOnly
                value="Собрать changelog, прогнать тесты и выкатить на staging."
                className="h-[62px] w-full resize-none rounded-[12px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3.5 py-[11px] text-[13px] text-[var(--color-body)] outline-none"
              />
              <div className="mb-1 mt-3.5 flex gap-2.5">
                <div className="flex-1">
                  <FieldLabel>Колонка</FieldLabel>
                  <Field>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-muted)]" />
                    <span className="text-[13px] font-medium text-[var(--color-ink)]">Бэклог</span>
                  </Field>
                </div>
                <div className="flex-1">
                  <FieldLabel>Приоритет</FieldLabel>
                  <Field>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-high-dot)]" />
                    <span className="text-[13px] font-medium text-[var(--color-ink)]">Высокий</span>
                  </Field>
                </div>
              </div>
              <div className="mb-[18px] flex gap-2.5">
                <div className="flex-1">
                  <FieldLabel>Исполнитель</FieldLabel>
                  <div className="flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border-input)] px-2.5">
                    <Initials bg="#F2D9CC" fg="#C45A38" size={24} font={9.5}>АК</Initials>
                    <span className="text-[13px] font-medium text-[var(--color-ink)]">{you} (вы)</span>
                  </div>
                </div>
                <div className="flex-1">
                  <FieldLabel>Срок</FieldLabel>
                  <Field>
                    <CalendarGlyph size={14} />
                    <span className="text-[13px] font-medium text-[var(--color-ink)]">28 июня</span>
                  </Field>
                </div>
              </div>
              <button
                onClick={onNext}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-[var(--btn-bg)] text-[15px] font-semibold text-[var(--btn-fg)] transition-colors hover:bg-[var(--btn-hover)] [animation:obRing_2s_ease-out_infinite]"
              >
                <PlusGlyph size={17} />
                Создать задачу
              </button>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={560} screen="bg-[var(--color-canvas)]">
        <div className="absolute inset-0 flex flex-col gap-2.5 p-4 opacity-50 blur-[3px]">
          {[0, 1].map((i) => (
            <div key={i} className="h-[70px] rounded-[10px] bg-[var(--color-surface)]" />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "rgba(27,27,26,.32)" }} />
        <div className="absolute inset-x-0 bottom-0 rounded-[24px_24px_30px_30px] bg-[var(--color-surface)] px-5 pb-6 pt-[22px] [animation:obDrop_.5s_ease_both]">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--color-border-input)]" />
          <h3 className="mb-3.5 text-[16px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Новая задача</h3>
          <input
            readOnly
            value="Подготовить релиз 2.0"
            className="mb-[11px] h-11 w-full rounded-[11px] border-[1.5px] border-[var(--color-accent)] bg-[var(--color-surface)] px-[13px] text-[14px] font-semibold text-[var(--color-ink)] outline-none"
            style={{ boxShadow: RING }}
          />
          <div className="mb-4 flex gap-2">
            <div className="flex h-[38px] flex-1 items-center gap-[7px] rounded-[10px] border border-[var(--color-border-input)] px-[11px]">
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-muted)]" />
              <span className="text-[12.5px] font-medium text-[var(--color-ink)]">Бэклог</span>
            </div>
            <div className="flex h-[38px] flex-1 items-center gap-[7px] rounded-[10px] border border-[var(--color-border-input)] px-[11px]">
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-high-dot)]" />
              <span className="text-[12.5px] font-medium text-[var(--color-ink)]">Высокий</span>
            </div>
          </div>
          <button
            onClick={onNext}
            className="flex h-12 w-full items-center justify-center gap-[7px] rounded-[12px] bg-[var(--btn-bg)] text-[14.5px] font-semibold text-[var(--btn-fg)]"
          >
            <PlusGlyph size={16} />
            Создать задачу
          </button>
        </div>
      </PhoneFrame>
    </Step>
  );
}

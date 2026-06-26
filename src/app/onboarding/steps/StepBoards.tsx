import { AV, CheckGlyph, DesktopCard, Initials, PhoneFrame, PlusGlyph, Step, Tip } from "../parts";

function Chip({ tone, children }: { tone: "high" | "normal"; children: React.ReactNode }) {
  const cls =
    tone === "high"
      ? "text-[var(--color-high)] bg-[var(--color-high-bg)]"
      : "text-[var(--color-normal)] bg-[var(--color-normal-bg)]";
  return <span className={`rounded-full px-[7px] py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[11px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 py-[11px] ${className}`}>
      {children}
    </div>
  );
}

function ColTitle({ name, count }: { name: string; count: number }) {
  return (
    <div className="flex items-center gap-[7px] px-1">
      <span className="text-[12px] font-bold text-[var(--color-ink)]">{name}</span>
      <span className="font-mono text-[11px] text-[var(--color-faint)]">{count}</span>
    </div>
  );
}

function RailIcon({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${active ? "bg-[#2E2E2B]" : ""}`}>{children}</div>
  );
}

export function StepBoards() {
  return (
    <Step
      step="03"
      kicker="ДОСКИ"
      title="Доски и колонки"
      subtitle="Каждый проект — это доска с колонками статусов. Перетаскивайте карточки, чтобы двигать задачи от «Бэклог» к «Готово»."
    >
      {/* desktop */}
      <DesktopCard className="flex h-[560px]">
        {/* slim rail */}
        <div className="flex w-14 flex-none flex-col items-center bg-[var(--color-sidebar)] py-[15px]">
          <div className="mb-[22px] flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ background: "var(--terracotta)" }}>
            <svg width="17" height="17" viewBox="0 0 100 100" fill="none">
              <rect x="14" y="56" width="18" height="34" rx="6" fill="#fff" opacity=".55" />
              <rect x="40" y="38" width="18" height="52" rx="6" fill="#fff" opacity=".82" />
              <rect x="66" y="20" width="18" height="70" rx="6" fill="#fff" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <RailIcon active>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="3" y="3" width="7" height="18" rx="1.5" />
                <rect x="14" y="3" width="7" height="11" rx="1.5" />
              </svg>
            </RailIcon>
            <RailIcon>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#86847E" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </RailIcon>
            <RailIcon>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#86847E" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </RailIcon>
          </div>
          <Initials bg="#F2D9CC" fg="#C45A38" size={32} className="mt-auto">АК</Initials>
        </div>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
          <div className="flex h-[58px] flex-none items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-[22px]">
            <div className="flex items-center gap-2.5">
              <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-accent)]" />
              <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Разработка платформы</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex">
                <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={28} font={10} className="border-2 border-[var(--color-surface)]">ДС</Initials>
                <Initials bg={AV.mv.bg} fg={AV.mv.fg} size={28} font={10} className="-ml-2 border-2 border-[var(--color-surface)]">МВ</Initials>
                <Initials bg={AV.ak.bg} fg={AV.ak.fg} size={28} font={10} className="-ml-2 border-2 border-[var(--color-surface)]">АК</Initials>
              </div>
              <button className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-[var(--btn-bg)] px-3.5 text-[12.5px] font-semibold text-[var(--btn-fg)]">
                <PlusGlyph size={13} />
                Задача
              </button>
            </div>
          </div>

          {/* columns */}
          <div className="relative flex min-h-0 flex-1 gap-3 p-4">
            {/* Бэклог */}
            <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <ColTitle name="Бэклог" count={3} />
              <Card>
                <div className="mb-[7px] flex gap-1.5"><Chip tone="high">Высокий</Chip></div>
                <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-ink)]">Обновить дизайн карточек</div>
              </Card>
              <Card>
                <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-ink)]">Рефакторинг авторизации</div>
              </Card>
            </div>

            {/* В работе */}
            <div className="relative flex min-w-0 flex-1 flex-col gap-[9px]">
              <ColTitle name="В работе" count={2} />
              <div className="h-[62px] rounded-[11px] border-[1.5px] border-dashed border-[var(--color-accent)] bg-[var(--color-accent-tint)]" />
              <Card>
                <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-ink)]">Настроить вебхуки</div>
              </Card>
              {/* lifted card */}
              <div className="absolute left-1.5 right-[-6px] top-[34px] z-[3] -rotate-[4deg] rounded-[11px] border border-[var(--color-accent)] bg-[var(--color-surface)] px-3 py-[11px] shadow-[0_14px_30px_rgba(85,70,224,0.22)] [animation:obTilt_2.6s_ease-in-out_infinite]">
                <div className="mb-[7px] flex gap-1.5"><Chip tone="normal">Обычный</Chip></div>
                <div className="mb-2 text-[12.5px] font-medium leading-[1.35] text-[var(--color-ink)]">Интеграция ЮKassa</div>
                <div className="flex items-center justify-between">
                  <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={22} font={9}>ДС</Initials>
                  <span className="font-mono text-[11px] text-[var(--color-faint)]">#214</span>
                </div>
              </div>
              {/* coachmark */}
              <Tip
                title="Перетащите карточку"
                body="Меняйте статус задачи, двигая её между колонками."
                className="absolute left-[-26px] top-[120px] z-[6] w-[228px]"
              >
                <div className="absolute left-[54px] top-[-7px] h-[14px] w-[14px] rotate-45 bg-[var(--tip-bg)]" />
              </Tip>
            </div>

            {/* На ревью */}
            <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <ColTitle name="На ревью" count={1} />
              <Card>
                <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-ink)]">Пуш-уведомления</div>
              </Card>
            </div>

            {/* Готово */}
            <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <ColTitle name="Готово" count={4} />
              <Card className="opacity-70">
                <div className="flex items-center gap-1.5">
                  <CheckGlyph size={13} stroke="var(--color-success)" />
                  <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-muted)] line-through">Схема БД</div>
                </div>
              </Card>
              <Card className="opacity-70">
                <div className="text-[12.5px] font-medium leading-[1.35] text-[var(--color-muted)] line-through">Прототип API</div>
              </Card>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* mobile */}
      <PhoneFrame height={560} screen="bg-[var(--color-canvas)]">
        <div className="flex-none border-b border-[var(--color-line)] bg-[var(--color-surface)] px-[18px] pb-2.5 pt-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Разработка платформы</span>
          </div>
        </div>
        <div className="flex flex-none gap-[7px] overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-[11px]">
          <span className="rounded-full bg-[var(--chip-neutral)] px-2.5 py-[5px] text-[11.5px] font-semibold text-[var(--color-muted)]">Бэклог</span>
          <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-[5px] text-[11.5px] font-semibold text-white">В работе</span>
          <span className="rounded-full bg-[var(--chip-neutral)] px-2.5 py-[5px] text-[11.5px] font-semibold text-[var(--color-muted)]">Ревью</span>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 px-4 py-3.5">
          <div className="rounded-[12px] border border-[var(--color-accent)] bg-[var(--color-surface)] p-[13px] shadow-[0_8px_20px_rgba(85,70,224,0.12)]">
            <div className="mb-2 flex gap-1.5"><Chip tone="normal">Обычный</Chip></div>
            <div className="mb-2.5 text-[13.5px] font-medium text-[var(--color-ink)]">Интеграция ЮKassa</div>
            <div className="flex items-center justify-between">
              <Initials bg={AV.ds.bg} fg={AV.ds.fg} size={24} font={9.5}>ДС</Initials>
              <span className="font-mono text-[11px] text-[var(--color-faint)]">#214</span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-[13px]">
            <div className="text-[13.5px] font-medium text-[var(--color-ink)]">Настроить вебхуки</div>
          </div>
          <div className="mt-1 rounded-[12px] bg-[var(--tip-bg)] px-3.5 py-3">
            <div className="flex items-center gap-[9px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8579F2" strokeWidth="2" className="flex-none">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <div className="text-[12px] leading-[1.4] text-[var(--tip-fg)]">Свайпайте между колонками, чтобы менять статус.</div>
            </div>
          </div>
        </div>
        <div className="flex h-[52px] flex-none items-center justify-around border-t border-[var(--color-line)] bg-[var(--color-surface)] px-3.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
            <rect x="3" y="3" width="7" height="18" rx="1.5" />
            <rect x="14" y="3" width="7" height="11" rx="1.5" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          </svg>
          <Initials bg="#F2D9CC" fg="#C45A38" size={24} font={9.5}>АК</Initials>
        </div>
      </PhoneFrame>
    </Step>
  );
}

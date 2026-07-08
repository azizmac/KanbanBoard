// Пустое состояние справа от списка (десктоп); на мобиле виден только список.
export default function ChatIndexPage() {
  return (
    <div className="hidden h-full place-items-center bg-[var(--color-canvas)] md:grid">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[20px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-[var(--color-ink)]">Выберите чат</p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          или начните новый — кнопка с карандашом слева
        </p>
      </div>
    </div>
  );
}

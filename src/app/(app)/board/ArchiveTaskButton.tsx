"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { archiveTask } from "./archive-actions";

/** Archive a task (or restore it when `archived`). Reused on the task detail and
 *  the board archive view. */
export function ArchiveTaskButton({ taskId, archived }: { taskId: string; archived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await archiveTask(taskId, !archived);
      if (res.ok) router.refresh();
      else alert(res.error ?? "Ошибка");
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex shrink-0 items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5 text-[13px] font-medium transition disabled:opacity-50 ${
        archived
          ? "border-[var(--color-border-input)] text-[var(--color-accent)] hover:border-[var(--color-accent)]"
          : "border-[var(--color-border-input)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
      </svg>
      {pending ? "…" : archived ? "Восстановить" : "В архив"}
    </button>
  );
}

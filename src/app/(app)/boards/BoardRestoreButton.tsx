"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setBoardArchived } from "../board/archive-actions";

export function BoardRestoreButton({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const res = await setBoardArchived(boardId, false);
          if (res.ok) router.refresh();
          else alert(res.error ?? "Ошибка");
        })
      }
      disabled={pending}
      className="shrink-0 rounded-[9px] border border-[var(--color-border-input)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--color-accent)] transition hover:border-[var(--color-accent)] disabled:opacity-50"
    >
      {pending ? "…" : "Восстановить"}
    </button>
  );
}

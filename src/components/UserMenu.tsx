"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { logoutAction } from "@/lib/auth-actions";

export function UserMenu({
  name,
  subtitle,
}: {
  name: string;
  subtitle: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-[var(--color-canvas)]"
      >
        <Avatar name={name} size={32} />
        <span className="hidden text-sm font-medium sm:block">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-lg">
          <div className="border-b border-[var(--color-line)] px-3 py-2">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-[var(--color-muted)]">{subtitle}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
            >
              Выйти
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/lib/auth-actions";
import { Avatar } from "./Avatar";

function IconBoard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  );
}
function IconTeam() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Sidebar({
  name,
  subtitle,
  isAdmin,
}: {
  name: string;
  subtitle: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items: NavItem[] = [
    { href: "/board", label: "Доска", icon: <IconBoard /> },
    { href: "/team", label: "Команда", icon: <IconTeam /> },
    ...(isAdmin ? [{ href: "/admin", label: "Админка", icon: <IconAdmin /> }] : []),
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center gap-1 bg-[var(--color-sidebar)] py-4 md:flex">
      <Link
        href="/board"
        className="mb-3 grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[var(--color-accent)] text-sm font-bold text-white"
      >
        K
      </Link>

      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            title={it.label}
            className={`grid h-11 w-11 place-items-center rounded-xl transition ${
              active
                ? "bg-[#2E2E2B] text-white"
                : "text-[#86847E] hover:bg-[#2E2E2B]/60 hover:text-white"
            }`}
          >
            {it.icon}
          </Link>
        );
      })}

      <div className="relative mt-auto" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full ring-2 ring-transparent transition hover:ring-white/20"
          title={name}
        >
          <Avatar name={name} size={36} />
        </button>
        {open && (
          <div className="absolute bottom-0 left-[52px] w-52 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-[0_10px_30px_rgba(20,20,20,0.12)]">
            <div className="border-b border-[var(--color-line)] px-3 py-2">
              <div className="truncate text-sm font-medium text-[var(--color-ink)]">{name}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{subtitle}</div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full px-3 py-2 text-left text-sm text-[var(--color-urgent)] transition hover:bg-[#FEF3F2]"
              >
                Выйти
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

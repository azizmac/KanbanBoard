"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

function IconBoard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  );
}
function IconTeam() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/board", label: "Доска", icon: <IconBoard /> },
    { href: "/team", label: "Команда", icon: <IconTeam /> },
    ...(isAdmin ? [{ href: "/admin", label: "Админка", icon: <IconAdmin /> }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-stretch border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
              active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
            }`}
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="flex flex-1">
        <button
          type="submit"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]"
        >
          <IconLogout />
          Выйти
        </button>
      </form>
    </nav>
  );
}

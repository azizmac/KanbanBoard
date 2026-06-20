"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconBoard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="11" rx="1.5" />
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
function IconProfile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconOrg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="13" y="7" width="3" height="10" rx="0.5" />
    </svg>
  );
}

export function MobileTabBar({ isAdmin, isRegional }: { isAdmin: boolean; isRegional: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/home", label: "Главная", icon: <IconHome />, match: ["/home"] },
    { href: "/boards", label: "Доски", icon: <IconBoard />, match: ["/boards", "/board"] },
    { href: "/search", label: "Поиск", icon: <IconSearch />, match: ["/search"] },
    // Leadership gets Сводка in the team slot (they reach the team via Админка).
    ...(isAdmin || isRegional
      ? [{ href: "/dashboard", label: "Сводка", icon: <IconDashboard />, match: ["/dashboard"] }]
      : [{ href: "/team", label: "Команда", icon: <IconTeam />, match: ["/team"] }]),
    ...(isAdmin
      ? [{ href: "/admin", label: "Админка", icon: <IconAdmin />, match: ["/admin"] }]
      : isRegional
        ? [{ href: "/admin/org", label: "Регионы", icon: <IconOrg />, match: ["/admin/org"] }]
        : []),
    { href: "/profile", label: "Профиль", icon: <IconProfile />, match: ["/profile"] },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-stretch border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((it) => {
        const active = it.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
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
    </nav>
  );
}

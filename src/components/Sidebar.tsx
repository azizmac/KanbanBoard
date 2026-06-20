"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";
import { LogoIcon } from "./Logo";

function IconBoard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="11" rx="1.5" />
    </svg>
  );
}
function IconMine() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
function IconOrg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="13" y="7" width="3" height="10" rx="0.5" />
    </svg>
  );
}

export function Sidebar({
  name,
  isAdmin,
  isRegional,
}: {
  name: string;
  isAdmin: boolean;
  isRegional: boolean;
}) {
  const pathname = usePathname();

  const items = [
    { href: "/boards", label: "Доски", icon: <IconBoard />, match: ["/boards", "/board"] },
    { href: "/my", label: "Мои", icon: <IconMine />, match: ["/my"] },
    { href: "/search", label: "Поиск", icon: <IconSearch />, match: ["/search"] },
    { href: "/team", label: "Команда", icon: <IconTeam />, match: ["/team"] },
    ...(isAdmin || isRegional
      ? [{ href: "/dashboard", label: "Сводка", icon: <IconDashboard />, match: ["/dashboard"] }]
      : []),
    ...(isAdmin
      ? [{ href: "/admin", label: "Админка", icon: <IconAdmin />, match: ["/admin"] }]
      : isRegional
        ? [{ href: "/admin/org", label: "Регионы", icon: <IconOrg />, match: ["/admin/org"] }]
        : []),
  ];

  const profileActive = pathname.startsWith("/profile");

  return (
    <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center gap-1 bg-[var(--color-sidebar)] py-4 md:flex">
      <Link href="/boards" title="Поток" className="mb-3">
        <LogoIcon size={34} />
      </Link>

      {items.map((it) => {
        const active = it.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
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

      <Link
        href="/profile"
        title="Профиль"
        className={`mt-auto rounded-full ring-2 transition ${
          profileActive ? "ring-white/70" : "ring-transparent hover:ring-white/20"
        }`}
      >
        <Avatar name={name} size={36} />
      </Link>
    </aside>
  );
}

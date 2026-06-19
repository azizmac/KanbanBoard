"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";

function IconBoard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="11" rx="1.5" />
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

export function Sidebar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/boards", label: "Доски", icon: <IconBoard />, match: ["/boards", "/board"] },
    { href: "/team", label: "Команда", icon: <IconTeam />, match: ["/team"] },
    ...(isAdmin ? [{ href: "/admin", label: "Админка", icon: <IconAdmin />, match: ["/admin"] }] : []),
  ];

  const profileActive = pathname.startsWith("/profile");

  return (
    <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center gap-1 bg-[var(--color-sidebar)] py-4 md:flex">
      <Link
        href="/boards"
        title="Поток"
        className="mb-3 grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[var(--color-accent)]"
      >
        <span className="h-3.5 w-3.5 rounded-[4px] border-[2.5px] border-white" />
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

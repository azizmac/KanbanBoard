import Link from "next/link";
import type { User } from "@/generated/prisma/client";
import { roleLabels } from "@/lib/constants";
import { NavLink } from "./NavLink";
import { UserMenu } from "./UserMenu";

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        <Link href="/board" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent)] text-sm text-white">
            K
          </span>
          <span className="hidden sm:block">Kanban</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          <NavLink href="/board">Доска</NavLink>
          <NavLink href="/team">Команда</NavLink>
          {user.role === "ADMIN" && <NavLink href="/admin">Админка</NavLink>}
        </nav>

        <div className="ml-auto">
          <UserMenu name={user.name} subtitle={user.position ?? roleLabels[user.role]} />
        </div>
      </div>
    </header>
  );
}

import { MobileTabBar } from "@/components/MobileTabBar";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";

// Authenticated pages are per-user and read the DB at request time — never
// statically prerender them at build (would try to reach the DB during build).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const subtitle = user.position ?? roleLabels[user.role];

  return (
    <div className="flex min-h-screen">
      <Sidebar name={user.name} subtitle={subtitle} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1 pb-[72px] md:pb-0">{children}</main>
      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}

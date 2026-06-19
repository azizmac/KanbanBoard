import { MobileTabBar } from "@/components/MobileTabBar";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar name={user.name} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1 pb-[72px] md:pb-0">{children}</main>
      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}

import { AppHeader } from "@/components/AppHeader";
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
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { MobileTabBar } from "@/components/MobileTabBar";
import { PushSetup } from "@/components/PushSetup";
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

  // First sign-in: hold new hires on the onboarding tour until they finish it.
  // /onboarding lives outside the (app) group, so there's no redirect loop.
  if (!user.onboardedAt) redirect("/onboarding");

  const isAdmin = user.role === "ADMIN";
  const isRegional = user.role === "MANAGER";

  return (
    <div className="flex min-h-screen">
      <PushSetup />
      <Sidebar name={user.name} avatarUrl={user.avatarUrl} isAdmin={isAdmin} isRegional={isRegional} />
      <main className="safe-top safe-x min-w-0 flex-1 pb-[72px] md:pb-0">{children}</main>
      <MobileTabBar isAdmin={isAdmin} isRegional={isRegional} />
    </div>
  );
}

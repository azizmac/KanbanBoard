import { requireUser } from "@/lib/auth";
import { listPositions } from "@/lib/org-data";
import { prisma } from "@/lib/prisma";
import { AdminPanel, type AdminUser } from "./AdminPanel";
import { AdminUnlock } from "./AdminUnlock";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return <AdminUnlock />;
  }

  const [users, positions] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] }),
    listPositions(),
  ]);

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    superAdmin: u.superAdmin,
    position: u.position,
    managerId: u.managerId,
    active: u.active,
    telegramLinked: Boolean(u.telegramId),
  }));

  const actorTier = user.superAdmin ? 3 : 2; // admin panel is ADMIN-only (tier ≥ 2)

  return (
    <AdminPanel users={rows} currentUserId={user.id} actorTier={actorTier} positions={positions} />
  );
}

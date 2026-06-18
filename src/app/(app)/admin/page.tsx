import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel, type AdminUser } from "./AdminPanel";
import { AdminUnlock } from "./AdminUnlock";

export default async function AdminPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return <AdminUnlock />;
  }

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    position: u.position,
    managerId: u.managerId,
    active: u.active,
    telegramLinked: Boolean(u.telegramId),
  }));

  return <AdminPanel users={rows} currentUserId={user.id} />;
}

import { canManageOrg } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getOrgAdminData } from "@/lib/org-data";
import { AdminUnlock } from "../AdminUnlock";
import { OrgPanel } from "../OrgPanel";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const user = await requireUser();
  if (!canManageOrg(user)) return <AdminUnlock />;

  const data = await getOrgAdminData();
  return (
    <OrgPanel
      regions={data.regions}
      groups={data.groups}
      users={data.users}
      boards={data.boards}
      positions={data.positions}
    />
  );
}

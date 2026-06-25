import { redirect } from "next/navigation";
import { isDirector, isRegional } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getStats } from "@/lib/stats-data";
import { StatsClient } from "./StatsClient";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await requireUser();
  if (!isDirector(user) && !isRegional(user)) redirect("/boards");

  const initial = await getStats(user, "month");

  return (
    <StatsClient
      initial={initial}
      role={isDirector(user) ? "director" : "regional"}
      regionLabel={isRegional(user) ? initial.regions.map((r) => r.name).join(", ") : undefined}
    />
  );
}

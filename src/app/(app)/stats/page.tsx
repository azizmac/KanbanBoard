import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** iiko stats live on the leadership dashboard. */
export default function StatsRedirect() {
  redirect("/dashboard?tab=sales");
}

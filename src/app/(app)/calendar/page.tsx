import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Calendar lives under «Моё» now. */
export default function CalendarRedirect() {
  redirect("/my?tab=calendar");
}

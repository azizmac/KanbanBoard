import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBoardOptions } from "@/lib/board-data";

export const dynamic = "force-dynamic";

// /board is a shortcut — send the user to their first board, or the overview.
export default async function BoardIndexPage() {
  const user = await requireUser();
  const boards = await getBoardOptions(user);
  if (boards.length === 0) redirect("/boards");
  redirect(`/board/${boards[0].id}`);
}

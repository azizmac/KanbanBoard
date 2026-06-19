import { redirect } from "next/navigation";
import { getBoardOptions } from "@/lib/board-data";

export const dynamic = "force-dynamic";

// /board is a shortcut — send the user to their first board, or the overview.
export default async function BoardIndexPage() {
  const boards = await getBoardOptions();
  if (boards.length === 0) redirect("/boards");
  redirect(`/board/${boards[0].id}`);
}

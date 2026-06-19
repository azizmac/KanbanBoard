import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth";
import { nowMs } from "@/lib/format";
import { getColumnOptions, getTaskDetail, getTeam } from "@/lib/task-data";
import { TaskDetailClient } from "./TaskDetailClient";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const user = await requireUser();
  const { taskId } = await params;

  const [task, team] = await Promise.all([getTaskDetail(taskId), getTeam()]);

  if (!task) notFound();

  const columns = await getColumnOptions(task.board.id);

  const canDelete = task.creator.id === user.id || can(user, "deleteAnyTask");

  return (
    <TaskDetailClient
      task={task}
      team={team}
      columns={columns}
      currentUser={{ id: user.id, name: user.name }}
      canDelete={canDelete}
      now={nowMs()}
    />
  );
}

import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth";
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

  const [task, team, columns] = await Promise.all([
    getTaskDetail(taskId),
    getTeam(),
    getColumnOptions(),
  ]);

  if (!task) notFound();

  const canDelete = task.creator.id === user.id || can(user, "deleteAnyTask");

  return (
    <TaskDetailClient
      task={task}
      team={team}
      columns={columns}
      currentUser={{ id: user.id, name: user.name }}
      canDelete={canDelete}
    />
  );
}

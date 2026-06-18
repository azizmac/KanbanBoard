"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { priorityClasses, priorityLabels } from "@/lib/constants";
import type { TaskCard } from "@/lib/types";

function formatDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function CommentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function TaskCardContent({ task, dragging }: { task: TaskCard; dragging?: boolean }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due ? due.getTime() < Date.now() : false;

  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 transition ${
        dragging ? "shadow-lg ring-2 ring-[var(--color-accent)]/30" : "shadow-sm hover:border-[var(--color-accent)]/40"
      }`}
    >
      <p className="line-clamp-3 text-sm font-medium leading-snug">{task.title}</p>

      <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <span
          className={`inline-flex items-center gap-1 ${priorityClasses[task.priority]}`}
          title={`Приоритет: ${priorityLabels[task.priority]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        {due && (
          <span className={overdue ? "font-medium text-rose-500" : ""}>{formatDate(due)}</span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <CommentIcon />
              {task.commentCount}
            </span>
          )}
          {task.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <ClipIcon />
              {task.attachmentCount}
            </span>
          )}
          {task.assignee && <Avatar name={task.assignee.name} size={22} />}
        </span>
      </div>
    </div>
  );
}

export function TaskCardView({ task }: { task: TaskCard }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const isTemp = task.id.startsWith("temp-");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isTemp) router.push(`/task/${task.id}`);
      }}
      className={`touch-none ${isDragging ? "dragging" : ""} ${isTemp ? "cursor-default opacity-60" : "cursor-pointer"}`}
    >
      <TaskCardContent task={task} />
    </div>
  );
}

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { priorityChip, priorityDot, priorityLabels } from "@/lib/constants";
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

function CheckCircle() {
  return (
    <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--color-success)] text-white">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

export function TaskCardContent({
  task,
  dragging,
  done,
}: {
  task: TaskCard;
  dragging?: boolean;
  done?: boolean;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due ? due.getTime() < Date.now() : false;

  return (
    <div
      className={`overflow-hidden rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition ${
        dragging
          ? "shadow-[0_10px_30px_rgba(20,20,20,0.12)] ring-2 ring-[var(--color-accent)]/25"
          : "hover:border-[var(--color-accent)]/40"
      } ${done ? "opacity-[0.78]" : ""}`}
    >
      {task.priority === "URGENT" && <div className="h-[3px] bg-[var(--color-urgent-dot)]" />}

      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-1.5">
          {done && <CheckCircle />}
          <span
            className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${priorityChip[task.priority]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
            {priorityLabels[task.priority]}
          </span>
        </div>

        <p
          className={`line-clamp-3 text-sm font-medium leading-[1.4] ${
            done ? "text-[#c9c6bf] line-through" : "text-[var(--color-ink)]"
          }`}
        >
          {task.title}
        </p>

        {(due || task.commentCount > 0 || task.attachmentCount > 0 || task.assignee) && (
          <div className="mt-2.5 flex items-center gap-2.5 text-xs text-[var(--color-muted)]">
            {due && (
              <span
                className={`font-mono ${
                  overdue
                    ? "rounded-md border border-[#FECDCA] bg-[#FEF3F2] px-1.5 py-0.5 font-medium text-[var(--color-urgent)]"
                    : ""
                }`}
              >
                {formatDate(due)}
              </span>
            )}
            {task.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <CommentIcon />
                {task.commentCount}
              </span>
            )}
            {task.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <ClipIcon />
                {task.attachmentCount}
              </span>
            )}
            {task.assignee && (
              <span className="ml-auto">
                <Avatar name={task.assignee.name} size={24} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskCardView({ task, done }: { task: TaskCard; done?: boolean }) {
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
      className={`${isDragging ? "dragging" : ""} ${isTemp ? "cursor-default opacity-60" : "cursor-pointer"}`}
    >
      <TaskCardContent task={task} done={done} />
    </div>
  );
}

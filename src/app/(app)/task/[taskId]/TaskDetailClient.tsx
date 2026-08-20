"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { UserLink } from "@/components/UserLink";
import { MentionTextarea } from "@/components/MentionTextarea";
import { priorityChip, priorityDot, priorityLabels } from "@/lib/constants";
import { activityText } from "@/lib/format";
import type {
  ActivityData,
  AttachmentData,
  ColumnOption,
  CommentData,
  Priority,
  TagData,
  TaskDetailData,
  TeamUser,
} from "@/lib/types";
import { ArchiveTaskButton } from "../../board/ArchiveTaskButton";
import { addComment, deleteAttachment, deleteTask, updateTask } from "./actions";
import { TimeTracking } from "./TimeTracking";
import { AssigneePicker } from "./AssigneePicker";
import { Checklist } from "./Checklist";
import { TaskTags } from "./TaskTags";

const fieldClass =
  "w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";
const sectionLabel =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";

function formatBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileExt(name: string) {
  const e = name.split(".").pop();
  return e && e.length <= 4 ? e.toUpperCase() : "FILE";
}

function RichText({ text, team }: { text: string; team: TeamUser[] }) {
  const byHandle = new Map(team.filter((u) => u.username).map((u) => [u.username!.toLowerCase(), u.id]));
  const nodes: React.ReactNode[] = [];
  const re = /(@\w{2,32})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const handle = m[1].slice(1).toLowerCase();
    const uid = byHandle.get(handle);
    if (uid) {
      nodes.push(
        <Link key={key++} href={`/u/${uid}`} className="font-medium text-[var(--color-accent)] hover:underline">
          {m[1]}
        </Link>,
      );
    } else {
      nodes.push(m[1]);
    }
    last = m.index + m[1].length;
  }
  nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{nodes}</span>;
}

export function TaskDetailClient({
  task,
  team,
  columns,
  boardTags,
  currentUser,
  canDelete,
  now,
}: {
  task: TaskDetailData;
  team: TeamUser[];
  columns: ColumnOption[];
  boardTags: TagData[];
  currentUser: { id: string; name: string };
  canDelete: boolean;
  now: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);

  const [desc, setDesc] = useState(task.description ?? "");
  const [savedDesc, setSavedDesc] = useState(task.description ?? "");

  const [columnId, setColumnId] = useState(task.columnId);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");

  const [comments, setComments] = useState<CommentData[]>(task.comments);
  const [commentBody, setCommentBody] = useState("");

  const [attachments, setAttachments] = useState<AttachmentData[]>(task.attachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columnName = columns.find((c) => c.id === columnId)?.name ?? task.column.name;
  const doneColumn = columns.find((c) => c.done);
  const isDone = columns.find((c) => c.id === columnId)?.done ?? false;
  const dueOverdue = due ? new Date(due).getTime() < now - 86_400_000 : false;

  // Merge comments + system notes into one chronological feed (GitLab-style).
  const feed = useMemo(() => {
    type FeedItem =
      | { type: "comment"; at: number; comment: CommentData }
      | { type: "event"; at: number; activity: ActivityData };
    const items: FeedItem[] = [
      ...comments.map((c) => ({ type: "comment" as const, at: Date.parse(c.createdAt), comment: c })),
      ...task.activities.map((a) => ({ type: "event" as const, at: Date.parse(a.createdAt), activity: a })),
    ];
    return items.sort((x, y) => x.at - y.at);
  }, [comments, task.activities]);

  function saveTitle() {
    setEditingTitle(false);
    const t = title.trim();
    if (!t || t === task.title) {
      setTitle(task.title);
      return;
    }
    startTransition(async () => {
      await updateTask(task.id, { title: t });
      router.refresh();
    });
  }

  function saveDesc() {
    startTransition(async () => {
      await updateTask(task.id, { description: desc || null });
      setSavedDesc(desc);
      router.refresh();
    });
  }

  function saveColumn(v: string) {
    setColumnId(v);
    startTransition(async () => {
      await updateTask(task.id, { columnId: v });
      router.refresh();
    });
  }
  function saveAssignee(v: string) {
    setAssigneeId(v);
    startTransition(async () => {
      await updateTask(task.id, { assigneeId: v || null });
      router.refresh();
    });
  }
  function savePriority(v: Priority) {
    setPriority(v);
    startTransition(async () => {
      await updateTask(task.id, { priority: v });
      router.refresh();
    });
  }
  function saveDue(v: string) {
    setDue(v);
    startTransition(async () => {
      await updateTask(task.id, { dueDate: v ? new Date(v).toISOString() : null });
      router.refresh();
    });
  }

  function sendComment() {
    const body = commentBody.trim();
    if (!body) return;
    const optimistic: CommentData = {
      id: `temp-${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      author: currentUser,
    };
    setComments((c) => [...c, optimistic]);
    setCommentBody("");
    startTransition(async () => {
      const res = await addComment(task.id, body);
      if (!res.ok) {
        setComments((c) => c.filter((x) => x.id !== optimistic.id));
        setError(res.error ?? "Не удалось отправить комментарий");
      }
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tasks/${task.id}/attachments`, { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) {
      const data = await res.json();
      setAttachments((a) => [...a, data.attachment]);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Не удалось загрузить файл");
    }
  }

  function removeAttachment(id: string) {
    setAttachments((a) => a.filter((x) => x.id !== id));
    startTransition(() => {
      void deleteAttachment(id);
    });
  }

  function removeTask() {
    if (!confirm("Удалить задачу безвозвратно?")) return;
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res?.ok) router.push(`/board/${task.board.id}`);
      else setError(res?.error ?? "Не удалось удалить");
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Breadcrumb bar */}
      <div className="flex h-[54px] shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-5 text-sm">
        <Link
          href={`/board/${task.board.id}`}
          className="inline-flex items-center gap-1 text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
        >
          ← {task.board.name}
        </Link>
        <span className="text-[var(--color-faint)]">/</span>
        <span className="text-[var(--color-muted)]">{columnName}</span>
        <span className="text-[var(--color-faint)]">/</span>
        <span className="font-mono text-xs text-[var(--color-faint)]">
          #{task.id.slice(-6).toUpperCase()}
        </span>
        {doneColumn && !isDone ? (
          <button
            onClick={() => saveColumn(doneColumn.id)}
            disabled={pending}
            title="Переместить в финальную колонку и завершить"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--color-success)] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            ✓ Закрыть задачу
          </button>
        ) : isDone ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--color-success-bg)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-success)]">
            ✓ Выполнена
          </span>
        ) : null}
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1 px-5 py-6 md:px-9 md:py-7">
          {/* priority chip + tags */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${priorityChip[priority]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[priority]}`} />
              {priorityLabels[priority]}
            </span>
            <TaskTags taskId={task.id} initialTags={task.tags} boardTags={boardTags} />
          </div>

          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="-ml-1 w-full rounded-lg border border-[var(--color-accent)] px-2 py-1 text-2xl font-bold tracking-[-0.03em] outline-none md:text-[27px]"
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="-ml-1 cursor-text rounded-lg px-1 text-2xl font-bold leading-tight tracking-[-0.03em] transition hover:bg-[var(--color-surface)] md:text-[27px]"
              title="Нажмите, чтобы изменить"
            >
              {title}
            </h1>
          )}

          {/* Description */}
          <div className="mt-6">
            <h3 className={sectionLabel}>Описание</h3>
            <MentionTextarea
              value={desc}
              onChange={setDesc}
              users={team}
              rows={4}
              placeholder="Добавьте описание… Используйте @, чтобы упомянуть коллегу."
            />
            {desc !== savedDesc && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={saveDesc}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setDesc(savedDesc)}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="mt-7">
            <Checklist taskId={task.id} initialItems={task.checklist} team={team} />
          </div>

          {/* Time tracking */}
          <div className="mt-7">
            <TimeTracking
              taskId={task.id}
              estimateMinutes={task.estimateMinutes}
              spentMinutes={task.spentMinutes}
              logs={task.timeLogs}
              currentUserId={currentUser.id}
              canManage={canDelete}
            />
          </div>

          {/* Attachments */}
          <div className="mt-7">
            <h3 className={sectionLabel}>Вложения ({attachments.length})</h3>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex min-w-[200px] flex-1 items-center gap-2.5 rounded-[10px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 py-2 sm:max-w-[280px]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-tint)] font-mono text-[10px] font-semibold text-[var(--color-accent)]">
                    {fileExt(a.filename)}
                  </span>
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1"
                  >
                    <span className="block truncate text-sm font-medium hover:text-[var(--color-accent)]">
                      {a.filename}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-faint)]">
                      {formatBytes(a.size)}
                    </span>
                  </a>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="text-[var(--color-faint)] transition hover:text-[var(--color-urgent)]"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={onUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 rounded-[10px] border border-dashed border-[var(--color-border-input)] px-3 py-2 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
            >
              {uploading ? "Загрузка…" : "+ Прикрепить файл"}
            </button>
          </div>

          {/* Activity feed: comments + system notes (history) */}
          <div className="mt-7">
            <h3 className={sectionLabel}>Активность</h3>
            <div className="space-y-3">
              {feed.map((item) =>
                item.type === "comment" ? (
                  <div key={item.comment.id} className="flex gap-2.5">
                    <UserLink id={item.comment.author.id} className="shrink-0">
                      <Avatar name={item.comment.author.name} size={30} />
                    </UserLink>
                    <div className="min-w-0 flex-1 rounded-[12px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3 py-2">
                      <div className="flex items-baseline gap-2">
                        <UserLink id={item.comment.author.id} className="text-sm font-semibold hover:underline">{item.comment.author.name}</UserLink>
                        <span className="font-mono text-xs text-[var(--color-faint)]">
                          {formatDateTime(item.comment.createdAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm leading-relaxed text-[var(--color-body)]">
                        <RichText text={item.comment.body} team={team} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={item.activity.id} className="flex items-center gap-2.5 pl-1">
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center">
                      <span className="h-2 w-2 rounded-full bg-[var(--color-faint)]" />
                    </span>
                    <p className="text-[13px] text-[var(--color-muted)]">
                      <span className="font-medium text-[var(--color-body)]">{item.activity.actor.name}</span>{" "}
                      {activityText(item.activity.kind, item.activity.detail)}
                      <span className="ml-2 font-mono text-[11px] text-[var(--color-faint)]">
                        {formatDateTime(item.activity.createdAt)}
                      </span>
                    </p>
                  </div>
                ),
              )}
              {feed.length === 0 && (
                <p className="text-sm text-[var(--color-muted)]">Пока нет активности.</p>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2.5">
              <Avatar name={currentUser.name} size={30} />
              <div className="min-w-0 flex-1">
                <MentionTextarea
                  value={commentBody}
                  onChange={setCommentBody}
                  users={team}
                  rows={2}
                  placeholder="Написать комментарий… (@ — упомянуть, Ctrl+Enter — отправить)"
                  onSubmit={sendComment}
                />
                <button
                  onClick={sendComment}
                  disabled={!commentBody.trim()}
                  className="mt-2 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Properties sidebar */}
        <aside className="shrink-0 space-y-4 border-t border-[var(--color-line)] bg-[var(--color-surface-warm)] px-5 py-6 md:w-[280px] md:border-l md:border-t-0">
          <div>
            <label className={labelClass}>Статус</label>
            <select className={fieldClass} value={columnId} onChange={(e) => saveColumn(e.target.value)}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Исполнитель</label>
            <AssigneePicker team={team} value={assigneeId} onChange={saveAssignee} />
          </div>

          <div>
            <label className={labelClass}>Приоритет</label>
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => savePriority(e.target.value as Priority)}
            >
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Дедлайн</label>
            <input
              type="date"
              className={`${fieldClass} font-mono ${
                dueOverdue ? "border-[#FECDCA] bg-[#FEF3F2] text-[var(--color-urgent)]" : ""
              }`}
              value={due}
              onChange={(e) => saveDue(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)]">
            <div className="flex items-center gap-1.5">
              <Avatar name={task.creator.name} size={18} />
              Автор:{" "}
              <UserLink id={task.creator.id} className="hover:underline">{task.creator.name}</UserLink>
            </div>
            <div className="font-mono">Создано: {formatDateTime(task.createdAt)}</div>
          </div>

          <div className="flex justify-start">
            <ArchiveTaskButton taskId={task.id} archived={task.archived} />
          </div>

          {canDelete && (
            <button
              onClick={removeTask}
              className="w-full rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm font-medium text-[var(--color-urgent)] transition hover:brightness-95"
            >
              Удалить задачу
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

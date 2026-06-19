"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRef, useState, useTransition } from "react";
import { AvatarStack } from "@/components/Avatar";
import { pluralTasks } from "@/lib/format";
import type { BoardData, BoardOption, ColumnData, TaskCard } from "@/lib/types";
import { BoardSwitcher } from "./BoardSwitcher";
import { BoardTelegramButton } from "./BoardTelegramButton";
import { ColumnView } from "./ColumnView";
import { TaskCardContent } from "./TaskCardView";
import { createTask, moveTask } from "./actions";

export function BoardView({
  board,
  boards,
  regions,
  memberNames,
  canCreate,
  tgLink,
}: {
  board: BoardData;
  boards: BoardOption[];
  regions: { id: string; name: string }[];
  memberNames: string[];
  canCreate: boolean;
  tgLink: { code: string; botUsername: string } | null;
}) {
  const [columns, setColumns] = useState<ColumnData[]>(board.columns);
  const columnsRef = useRef<ColumnData[]>(board.columns);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string>(board.columns[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  function setCols(updater: (prev: ColumnData[]) => ColumnData[]) {
    setColumns((prev) => {
      const next = updater(prev);
      columnsRef.current = next;
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function columnIdOf(cols: ColumnData[], itemId: string): string | undefined {
    if (cols.some((c) => c.id === itemId)) return itemId;
    return cols.find((c) => c.tasks.some((t) => t.id === itemId))?.id;
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    for (const c of columnsRef.current) {
      const t = c.tasks.find((t) => t.id === id);
      if (t) {
        setActiveTask(t);
        return;
      }
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const cur = columnsRef.current;
    const fromCol = columnIdOf(cur, activeId);
    const toCol = columnIdOf(cur, overId);
    if (!fromCol || !toCol || fromCol === toCol) return;

    setCols((prev) => {
      const from = prev.find((c) => c.id === fromCol)!;
      const to = prev.find((c) => c.id === toCol)!;
      const moving = from.tasks.find((t) => t.id === activeId);
      if (!moving) return prev;

      const overIndex = to.tasks.findIndex((t) => t.id === overId);
      const insertAt = overId === toCol || overIndex < 0 ? to.tasks.length : overIndex;

      return prev.map((c) => {
        if (c.id === fromCol) return { ...c, tasks: c.tasks.filter((t) => t.id !== activeId) };
        if (c.id === toCol) {
          const next = [...c.tasks];
          next.splice(insertAt, 0, moving);
          return { ...c, tasks: next };
        }
        return c;
      });
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);

    const activeId = String(active.id);
    const cur = columnsRef.current;
    const colId = cur.find((c) => c.tasks.some((t) => t.id === activeId))?.id;
    if (!colId) return;

    const column = cur.find((c) => c.id === colId)!;
    const oldIndex = column.tasks.findIndex((t) => t.id === activeId);
    let newIndex = oldIndex;

    if (over) {
      const overId = String(over.id);
      if (overId === colId) newIndex = column.tasks.length - 1;
      else {
        const idx = column.tasks.findIndex((t) => t.id === overId);
        newIndex = idx >= 0 ? idx : column.tasks.length - 1;
      }
    }

    const reordered =
      oldIndex === newIndex ? column.tasks : arrayMove(column.tasks, oldIndex, newIndex);

    setCols((prev) => prev.map((c) => (c.id === colId ? { ...c, tasks: reordered } : c)));

    const orderedIds = reordered.map((t) => t.id);
    if (orderedIds.some((id) => id.startsWith("temp-"))) return;
    startTransition(() => {
      void moveTask({ taskId: activeId, toColumnId: colId, orderedIds });
    });
  }

  async function handleAddTask(columnId: string, title: string) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskCard = {
      id: tempId,
      title,
      priority: "NORMAL",
      dueDate: null,
      overdue: false,
      assignee: null,
      commentCount: 0,
      attachmentCount: 0,
      tags: [],
    };
    setCols((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, tasks: [...c.tasks, optimistic] } : c)),
    );

    const res = await createTask({ columnId, title });
    if (res.ok) {
      setCols((prev) =>
        prev.map((c) =>
          c.id === columnId
            ? { ...c, tasks: c.tasks.map((t) => (t.id === tempId ? { ...t, id: res.id } : t)) }
            : c,
        ),
      );
    } else {
      setCols((prev) =>
        prev.map((c) =>
          c.id === columnId ? { ...c, tasks: c.tasks.filter((t) => t.id !== tempId) } : c,
        ),
      );
    }
  }

  const q = query.trim().toLowerCase();
  const view = q
    ? columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.title.toLowerCase().includes(q)) }))
    : columns;

  const total = columns.reduce((n, c) => n + c.tasks.length, 0);
  const inProgress = columns.find((c) => c.name.includes("работе"))?.tasks.length ?? 0;

  function newTask() {
    const target = activeColumnId || columns[0]?.id;
    if (target) setAddingColumnId(target);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ---- Desktop top bar ---- */}
      <div className="sticky top-0 z-20 hidden h-[62px] shrink-0 items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-6 sm:flex">
        <BoardSwitcher current={board} boards={boards} regions={regions} canCreate={canCreate} />
        <div className="hidden h-[22px] w-px bg-[var(--color-line)] lg:block" />
        <span className="hidden whitespace-nowrap text-[13px] text-[var(--color-muted)] lg:inline">
          {pluralTasks(total)} · {inProgress} в работе
        </span>

        <div className="ml-auto flex items-center gap-3">
          {memberNames.length > 0 && (
            <span className="hidden md:inline">
              <AvatarStack names={memberNames} size={30} max={4} />
            </span>
          )}
          <div className="relative">
            <svg
              width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2"
              className="pointer-events-none absolute left-2.5 top-[9.5px]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="h-9 w-[180px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-8 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          {tgLink && (
            <BoardTelegramButton code={tgLink.code} botUsername={tgLink.botUsername} boardName={board.name} />
          )}
          <button
            onClick={newTask}
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13.5px] font-semibold text-white transition hover:opacity-90"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Задача
          </button>
        </div>
      </div>

      {/* ---- Mobile header + column pills ---- */}
      <div className="sticky top-0 z-20 shrink-0 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 pt-3 pb-2.5 sm:hidden">
        <BoardSwitcher current={board} boards={boards} regions={regions} canCreate={canCreate} />
        <div className="scroll-thin -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
          {columns.map((c) => {
            const on = c.id === activeColumnId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveColumnId(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                  on
                    ? "bg-[var(--color-sidebar)] text-white"
                    : "bg-[#F2F1ED] text-[var(--color-muted)]"
                }`}
              >
                {c.name} · {c.tasks.length}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Columns ---- */}
      <div className="relative min-h-0 flex-1">
        <DndContext
          id="kanban-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="scroll-thin flex gap-4 overflow-x-auto px-4 py-5 sm:px-6">
            {view.map((column) => (
              <div
                key={column.id}
                className={`${column.id === activeColumnId ? "flex" : "hidden"} w-full shrink-0 sm:flex sm:w-[286px]`}
              >
                <ColumnView
                  column={column}
                  onAddTask={handleAddTask}
                  adding={addingColumnId === column.id}
                  onAddingChange={(open) => setAddingColumnId(open ? column.id : null)}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-[286px] rotate-1">
                <TaskCardContent task={activeTask} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Mobile FAB */}
        <button
          onClick={newTask}
          className="fixed bottom-[88px] right-[18px] z-20 grid h-[52px] w-[52px] place-items-center rounded-[16px] bg-[var(--color-accent)] text-white shadow-[0_6px_16px_rgba(85,70,224,0.4)] sm:hidden"
          aria-label="Новая задача"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

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
import type { BoardData, ColumnData, TaskCard } from "@/lib/types";
import { ColumnView } from "./ColumnView";
import { TaskCardContent } from "./TaskCardView";
import { createTask, moveTask } from "./actions";

export function BoardView({ board }: { board: BoardData }) {
  const [columns, setColumns] = useState<ColumnData[]>(board.columns);
  const columnsRef = useRef<ColumnData[]>(board.columns);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [, startTransition] = useTransition();

  // setColumns wrapper that keeps a synchronous ref in sync for drag math.
  function setCols(updater: (prev: ColumnData[]) => ColumnData[]) {
    setColumns((prev) => {
      const next = updater(prev);
      columnsRef.current = next;
      return next;
    });
  }

  const sensors = useSensors(
    // Desktop: start dragging after a small move.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: long-press to drag, so normal taps and scrolling still work.
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

  // Move a card between columns live while dragging.
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
    if (orderedIds.some((id) => id.startsWith("temp-"))) return; // wait until persisted
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
      assignee: null,
      commentCount: 0,
      attachmentCount: 0,
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

  return (
    <div className="px-4 py-4">
      <DndContext
        id="kanban-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <ColumnView key={column.id} column={column} onAddTask={handleAddTask} />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72">
              <TaskCardContent task={activeTask} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

import type { Priority } from "@/generated/prisma/client";

export type { Priority };

export type TagData = { id: string; name: string; color: string };

export type TaskCard = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  overdue: boolean;
  assignee: { id: string; name: string } | null;
  commentCount: number;
  attachmentCount: number;
  tags: TagData[];
};

export type ColumnData = {
  id: string;
  name: string;
  tasks: TaskCard[];
};

export type BoardData = {
  id: string;
  name: string;
  color: string;
  columns: ColumnData[];
};

/** A board as shown on the "Все доски" overview grid. */
export type BoardSummary = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  // segment widths (0..1) for the progress bar
  doneRatio: number;
  reviewRatio: number;
  progressRatio: number;
  memberNames: string[];
  updatedLabel: string;
};

/** A board as shown in the header switcher dropdown. */
export type BoardOption = { id: string; name: string; color: string };

/** A task row on the "Мои задачи" screen. */
export type MyTaskRow = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  overdue: boolean;
  boardId: string;
  boardName: string;
  boardColor: string;
  columnName: string;
  done: boolean;
};

export type UserRef = { id: string; name: string };

export type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  author: UserRef;
};

export type AttachmentData = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploader: UserRef;
};

export type ChecklistItemData = { id: string; text: string; done: boolean };

export type ActivityData = {
  id: string;
  kind: string;
  detail: string | null;
  createdAt: string;
  actor: UserRef;
};

export type TaskDetailData = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  columnId: string;
  column: { id: string; name: string };
  board: { id: string; name: string; color: string };
  creator: UserRef;
  assignee: UserRef | null;
  createdAt: string;
  updatedAt: string;
  comments: CommentData[];
  attachments: AttachmentData[];
  tags: TagData[];
  checklist: ChecklistItemData[];
  activities: ActivityData[];
};

export type TeamUser = {
  id: string;
  name: string;
  username: string | null;
  position: string | null;
  role: import("@/generated/prisma/client").Role;
};

export type ColumnOption = { id: string; name: string };

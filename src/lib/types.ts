import type { Priority } from "@/generated/prisma/client";

export type { Priority };

export type TaskCard = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
  commentCount: number;
  attachmentCount: number;
};

export type ColumnData = {
  id: string;
  name: string;
  tasks: TaskCard[];
};

export type BoardData = {
  id: string;
  name: string;
  columns: ColumnData[];
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

export type TaskDetailData = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  columnId: string;
  column: { id: string; name: string };
  creator: UserRef;
  assignee: UserRef | null;
  createdAt: string;
  updatedAt: string;
  comments: CommentData[];
  attachments: AttachmentData[];
};

export type TeamUser = {
  id: string;
  name: string;
  username: string | null;
  position: string | null;
  role: import("@/generated/prisma/client").Role;
};

export type ColumnOption = { id: string; name: string };

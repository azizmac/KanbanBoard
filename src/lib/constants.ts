import type { NotificationType, Priority, Role } from "@/generated/prisma/client";

// Role tiers, relabeled as the org hierarchy (see lib/access.ts):
//   ADMIN = Директор, MANAGER = Регионал, MEMBER = Линейный
export const roleLabels: Record<Role, string> = {
  ADMIN: "Директор",
  MANAGER: "Регионал",
  MEMBER: "Линейный",
};

export const priorityLabels: Record<Priority, string> = {
  LOW: "Низкий",
  NORMAL: "Обычный",
  HIGH: "Высокий",
  URGENT: "Срочно",
};

// Priority chip (background + text) and the small status dot.
export const priorityChip: Record<Priority, string> = {
  LOW: "bg-[var(--color-low-bg)] text-[var(--color-low)]",
  NORMAL: "bg-[var(--color-normal-bg)] text-[var(--color-normal)]",
  HIGH: "bg-[var(--color-high-bg)] text-[var(--color-high)]",
  URGENT: "bg-[var(--color-urgent-bg)] text-[var(--color-urgent)]",
};

export const priorityDot: Record<Priority, string> = {
  LOW: "bg-[var(--color-low-dot)]",
  NORMAL: "bg-[var(--color-normal-dot)]",
  HIGH: "bg-[var(--color-high-dot)]",
  URGENT: "bg-[var(--color-urgent-dot)]",
};

export const notificationLabels: Record<NotificationType, string> = {
  ASSIGNED: "Назначена задача",
  MENTIONED: "Вас упомянули",
  COMMENTED: "Новый комментарий",
  DUE_SOON: "Скоро дедлайн",
};

/** Telegram features are enabled only when a bot token is configured. */
export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

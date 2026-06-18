import type { NotificationType, Priority, Role } from "@/generated/prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  MEMBER: "Участник",
};

export const priorityLabels: Record<Priority, string> = {
  LOW: "Низкий",
  NORMAL: "Обычный",
  HIGH: "Высокий",
  URGENT: "Срочно",
};

// Tailwind-friendly accent per priority (used for the small dot/label).
export const priorityClasses: Record<Priority, string> = {
  LOW: "text-slate-400",
  NORMAL: "text-sky-500",
  HIGH: "text-amber-500",
  URGENT: "text-rose-500",
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

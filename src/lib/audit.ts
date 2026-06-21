import { prisma } from "./prisma";

// Human-readable verbs for audit actions (rendered in /admin/audit).
export const AUDIT_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: "сменил роль",
  USER_DEACTIVATED: "деактивировал",
  USER_ACTIVATED: "активировал",
  USER_CREATED: "создал пользователя",
  INVITE_CREATED: "создал ссылку-приглашение",
  GROUP_INVITE_CREATED: "создал приглашение в группу",
};

export async function recordAudit(input: {
  actorId: string;
  action: keyof typeof AUDIT_LABELS;
  targetUserId?: string | null;
  detail?: string | null;
}) {
  // Audit is best-effort: never let logging failure break the action itself.
  await prisma.auditLog
    .create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetUserId: input.targetUserId ?? null,
        detail: input.detail ?? null,
      },
    })
    .catch(() => {});
}

export async function listAudit(take = 150) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: { select: { id: true, name: true } },
      targetUser: { select: { id: true, name: true } },
    },
  });
}

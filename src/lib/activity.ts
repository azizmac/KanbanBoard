import type { ActivityKind } from "@/generated/prisma/client";
import { prisma } from "./prisma";

/** Append a system note to a task's history. Best-effort: never throws. */
export async function recordActivity(
  taskId: string,
  actorId: string,
  kind: ActivityKind,
  detail?: string | null,
) {
  try {
    await prisma.activity.create({ data: { taskId, actorId, kind, detail: detail ?? null } });
  } catch {
    // history is non-critical — don't fail the underlying action
  }
}

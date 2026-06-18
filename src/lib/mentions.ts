import { prisma } from "./prisma";
import { notify } from "./notify";

/** Extract unique @handles (2–32 chars, alnum + underscore) from text, lowercased. */
export function extractHandles(text: string): string[] {
  const re = /(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{2,32})/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) set.add(m[1].toLowerCase());
  return [...set];
}

type ProcessInput = {
  text: string;
  actorId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
  commentId?: string;
};

/**
 * Resolve @handles to users, record Mention rows and notify them.
 * For task descriptions (no commentId) duplicate mentions are skipped so a
 * user isn't re-notified on every edit.
 */
export async function processMentions(input: ProcessInput) {
  const handles = extractHandles(input.text);
  if (handles.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: handles }, active: true },
  });

  for (const user of users) {
    if (user.id === input.actorId) continue;

    if (input.commentId == null) {
      const existing = await prisma.mention.findFirst({
        where: { taskId: input.taskId, userId: user.id, commentId: null },
      });
      if (existing) continue;
    }

    await prisma.mention.create({
      data: {
        userId: user.id,
        taskId: input.taskId,
        commentId: input.commentId ?? null,
      },
    });

    await notify({
      userId: user.id,
      type: "MENTIONED",
      message: `${input.actorName} упомянул(а) вас в задаче «${input.taskTitle}»`,
      taskId: input.taskId,
    });
  }
}

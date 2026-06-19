import { createHmac } from "node:crypto";

// Signed code to link a Telegram group chat to a board. Director/regional copies
// it from the board and runs `/link <code>` in the group.

function secret() {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 24);
}

export function makeBoardLinkCode(boardId: string): string {
  const payload = Buffer.from(boardId).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyBoardLinkCode(code: string): string | null {
  const [payload, sig] = code.trim().split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

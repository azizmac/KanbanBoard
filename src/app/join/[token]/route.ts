import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { verifyInviteToken } from "@/lib/invite";

export const runtime = "nodejs";

// Opening an invite link stores the (validated) token in a short-lived cookie,
// then sends the user to the Telegram login. The auth callback reads it back.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!verifyInviteToken(token)) redirect("/login?error=badinvite");

  const store = await cookies();
  store.set("kanban_invite", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30, // 30 min to finish logging in
  });
  redirect("/login");
}

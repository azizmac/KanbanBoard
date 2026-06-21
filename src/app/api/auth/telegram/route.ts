import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { resolveTelegramLogin } from "@/lib/tg-auth";
import { verifyTelegramAuth } from "@/lib/telegram-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());

  if (!verifyTelegramAuth(params)) {
    redirect("/login?error=telegram");
  }

  const telegramId = params.id;
  const tgUsername = params.username?.toLowerCase();
  const name =
    [params.first_name, params.last_name].filter(Boolean).join(" ").trim() ||
    tgUsername ||
    "Пользователь";

  const store = await cookies();
  const inviteTok = store.get("kanban_invite")?.value ?? null;

  const result = await resolveTelegramLogin({ telegramId, username: tgUsername, name }, inviteTok);
  if (!result.ok) {
    redirect(`/login?error=${result.error}`);
  }

  if (inviteTok) store.delete("kanban_invite");
  await createSession(result.userId);
  redirect("/home");
}

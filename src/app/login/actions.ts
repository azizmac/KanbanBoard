"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Dev-only login: pick a seeded user. Disabled in production. */
export async function devLoginAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev login is disabled in production");
  }
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new Error("User not found");
  }
  await createSession(user.id);
  redirect("/board");
}

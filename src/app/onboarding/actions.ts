"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Finish (or skip) onboarding: stamp `onboardedAt` once and head to the boards. */
export async function completeOnboarding() {
  const user = await requireUser();

  if (!user.onboardedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardedAt: new Date() },
    });
  }

  redirect("/boards");
}

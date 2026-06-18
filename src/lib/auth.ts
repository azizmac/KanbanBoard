import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import type { Role, User } from "@/generated/prisma/client";

const COOKIE = "kanban_session";
const SESSION_DAYS = 30;

function expiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

/** Create a DB-backed session and set the httpOnly cookie. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = expiry();
  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Remove the current session (logout). */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(COOKIE);
}

/** Resolve the logged-in user, or null. Safe to call anywhere on the server. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.active) return null;
  return session.user;
}

/** Require a logged-in user, redirecting to /login otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles, redirecting to / otherwise. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export function can(user: Pick<User, "role">, action: "manageUsers" | "manageBoard" | "deleteAnyTask") {
  switch (action) {
    case "manageUsers":
      return user.role === "ADMIN";
    case "manageBoard":
      return user.role === "ADMIN" || user.role === "MANAGER";
    case "deleteAnyTask":
      return user.role === "ADMIN" || user.role === "MANAGER";
  }
}

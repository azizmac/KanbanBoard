"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { roleLabels } from "@/lib/constants";
import { addUser, updateUser } from "./actions";

type Role = "ADMIN" | "MANAGER" | "MEMBER";

export type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  role: Role;
  position: string | null;
  managerId: string | null;
  active: boolean;
  telegramLinked: boolean;
};

const ctl =
  "rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]";

export function AdminPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminUser[]>(users);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // add-user form
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    position: "",
    role: "MEMBER" as Role,
    managerId: "",
  });

  function patch(id: string, data: Partial<AdminUser>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...data } : r)));
    setError(null);
    startTransition(async () => {
      const res = await updateUser(id, data as never);
      if (!res.ok) {
        setError(res.error ?? "Ошибка");
        router.refresh();
      }
    });
  }

  function submitAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addUser(form);
      if (res.ok) {
        if (res.user) setRows((rs) => [...rs, res.user as AdminUser]);
        setForm({ name: "", username: "", position: "", role: "MEMBER", managerId: "" });
        setAdding(false);
      } else {
        setError(res.error ?? "Ошибка");
      }
    });
  }

  const managerOptions = rows.filter((r) => r.active);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Админка · команда</h1>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {adding ? "Закрыть" : "+ Добавить"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      )}

      {adding && (
        <div className="mb-4 grid gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
          <input
            className={ctl}
            placeholder="Имя"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={ctl}
            placeholder="@username (Telegram)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.replace(/^@/, "") })}
          />
          <input
            className={ctl}
            placeholder="Должность"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <select
            className={ctl}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value="MEMBER">{roleLabels.MEMBER}</option>
            <option value="MANAGER">{roleLabels.MANAGER}</option>
            <option value="ADMIN">{roleLabels.ADMIN}</option>
          </select>
          <select
            className={`${ctl} sm:col-span-1`}
            value={form.managerId}
            onChange={(e) => setForm({ ...form, managerId: e.target.value })}
          >
            <option value="">— без руководителя —</option>
            {managerOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            onClick={submitAdd}
            disabled={!form.name.trim()}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((u) => (
          <div
            key={u.id}
            className={`rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 ${
              u.active ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar name={u.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{u.name}</span>
                  {u.username && <span className="text-xs text-[var(--color-muted)]">@{u.username}</span>}
                  {u.id === currentUserId && <span className="text-xs text-[var(--color-muted)]">(вы)</span>}
                  {u.telegramLinked && (
                    <span className="rounded bg-emerald-50 px-1.5 text-[11px] text-emerald-600">TG</span>
                  )}
                  {!u.active && (
                    <span className="rounded bg-rose-50 px-1.5 text-[11px] text-rose-600">неактивен</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => patch(u.id, { active: !u.active })}
                disabled={u.id === currentUserId}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                  u.active
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {u.active ? "Деактивировать" : "Активировать"}
              </button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <select
                className={ctl}
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value as Role })}
              >
                <option value="MEMBER">{roleLabels.MEMBER}</option>
                <option value="MANAGER">{roleLabels.MANAGER}</option>
                <option value="ADMIN">{roleLabels.ADMIN}</option>
              </select>
              <input
                className={ctl}
                placeholder="Должность"
                value={u.position ?? ""}
                onChange={(e) =>
                  setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, position: e.target.value } : r)))
                }
                onBlur={(e) => patch(u.id, { position: e.target.value })}
              />
              <select
                className={ctl}
                value={u.managerId ?? ""}
                onChange={(e) => patch(u.id, { managerId: e.target.value || null })}
              >
                <option value="">— руководитель —</option>
                {managerOptions
                  .filter((m) => m.id !== u.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  "h-[38px] w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent)]/10";

const roleSelectClass: Record<Role, string> = {
  ADMIN: "border-[#FEF0C7] bg-[#FFFBEB] text-[#B54708] font-semibold",
  MANAGER: "border-[var(--color-border-input)] bg-[var(--color-surface)]",
  MEMBER: "border-[var(--color-border-input)] bg-[var(--color-surface)]",
};

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const FILTERS: { key: "ALL" | Role; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "ADMIN", label: "Админы" },
  { key: "MANAGER", label: "Менеджеры" },
  { key: "MEMBER", label: "Участники" },
];

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

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Role>("ALL");

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

  const counts = useMemo(() => {
    const admins = rows.filter((r) => r.role === "ADMIN").length;
    const managers = rows.filter((r) => r.role === "MANAGER").length;
    return { total: rows.length, admins, managers };
  }, [rows]);

  const visible = rows.filter((u) => {
    if (filter !== "ALL" && u.role !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-7 sm:px-9">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <h1 className="text-[24px] font-bold tracking-[-0.03em]">Управление доступом</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF0C7] px-2.5 py-1 text-[11.5px] font-semibold text-[#B54708]">
              <ShieldIcon />
              Только админ
            </span>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {counts.total} участников · {counts.admins} админ · {counts.managers} менеджера ·
            <span className="ml-1">все видят все доски</span>
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex h-10 items-center gap-2 rounded-[11px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          {adding ? "Закрыть" : "Добавить"}
        </button>
      </div>

      {/* Search + filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full sm:w-[280px]">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2"
            className="pointer-events-none absolute left-3 top-[11px]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или @username"
            className="h-[38px] w-full rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-[9px] px-3 py-2 text-[13px] font-medium transition ${
                filter === f.key
                  ? "bg-[var(--color-sidebar)] text-white"
                  : "bg-[#F2F1ED] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">
          {error}
        </div>
      )}

      {/* Add-user form */}
      {adding && (
        <div className="mt-4 grid gap-2.5 rounded-[14px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] p-4 sm:grid-cols-2">
          <input className={ctl} placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input
            className={ctl}
            placeholder="@username (Telegram)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.replace(/^@/, "") })}
          />
          <input className={ctl} placeholder="Должность" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <select className={ctl} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="MEMBER">{roleLabels.MEMBER}</option>
            <option value="MANAGER">{roleLabels.MANAGER}</option>
            <option value="ADMIN">{roleLabels.ADMIN}</option>
          </select>
          <select className={ctl} value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
            <option value="">— без руководителя —</option>
            {managerOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            onClick={submitAdd}
            disabled={!form.name.trim()}
            className="h-[38px] rounded-[10px] bg-[var(--color-accent)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      )}

      {/* Table head (desktop) */}
      <div className="mt-6 hidden grid-cols-[2.2fr_1.4fr_2fr_0.7fr] gap-4 border-b border-[var(--color-line)] px-1 pb-3 md:grid">
        {["Пользователь", "Роль", "Должность · Руководитель", ""].map((h, i) => (
          <span key={i} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--color-line)] md:divide-y-0">
        {visible.map((u) => (
          <div
            key={u.id}
            className={`grid grid-cols-1 gap-3 border-b border-[var(--color-border-card)] py-3.5 md:grid-cols-[2.2fr_1.4fr_2fr_0.7fr] md:items-center md:gap-4 md:border-b md:border-[var(--color-line)] md:px-1 ${
              u.active ? "" : "opacity-60"
            }`}
          >
            {/* user */}
            <div className="flex items-center gap-3">
              <Avatar name={u.name} size={38} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14.5px] font-semibold text-[var(--color-ink)]">{u.name}</span>
                  {u.id === currentUserId && <span className="text-[11px] text-[var(--color-muted)]">· вы</span>}
                  {u.telegramLinked && (
                    <span className="rounded bg-[var(--color-accent-soft)] px-1.5 text-[10px] font-medium text-[var(--color-accent)]">TG</span>
                  )}
                  {!u.active && (
                    <span className="rounded bg-[#FEF3F2] px-1.5 text-[10px] font-medium text-[var(--color-urgent)]">неактивен</span>
                  )}
                </div>
                {u.username && (
                  <div className="font-mono text-[12.5px] text-[var(--color-faint)]">@{u.username}</div>
                )}
              </div>
            </div>

            {/* role */}
            <div>
              <select
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value as Role })}
                className={`h-[34px] w-full max-w-[180px] rounded-[9px] border px-2.5 text-[13.5px] outline-none focus:border-[var(--color-accent)] ${roleSelectClass[u.role]}`}
              >
                <option value="MEMBER">{roleLabels.MEMBER}</option>
                <option value="MANAGER">{roleLabels.MANAGER}</option>
                <option value="ADMIN">{roleLabels.ADMIN}</option>
              </select>
            </div>

            {/* position + manager */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-[34px] flex-1 rounded-[9px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
                placeholder="Должность"
                value={u.position ?? ""}
                onChange={(e) =>
                  setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, position: e.target.value } : r)))
                }
                onBlur={(e) => patch(u.id, { position: e.target.value })}
              />
              <select
                className="h-[34px] flex-1 rounded-[9px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
                value={u.managerId ?? ""}
                onChange={(e) => patch(u.id, { managerId: e.target.value || null })}
              >
                <option value="">— руководитель —</option>
                {managerOptions
                  .filter((m) => m.id !== u.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
              </select>
            </div>

            {/* actions */}
            <div className="flex md:justify-end">
              <button
                onClick={() => patch(u.id, { active: !u.active })}
                disabled={u.id === currentUserId}
                className={`rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition disabled:opacity-40 ${
                  u.active
                    ? "text-[var(--color-urgent)] hover:bg-[#FEF3F2]"
                    : "text-[var(--color-success)] hover:bg-[#DCF3E8]"
                }`}
              >
                {u.active ? "Деактивировать" : "Активировать"}
              </button>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Никого не найдено.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { roleLabels } from "@/lib/constants";
import { tint } from "@/lib/tints";
import {
  createGroup,
  createRegion,
  deleteGroup,
  deleteRegion,
  renameGroup,
  renameRegion,
  setGroupBoards,
  setGroupMembers,
  setRegionManagers,
} from "./org-actions";

type Opt = { id: string; name: string };
type Region = { id: string; name: string; color: string; managerIds: string[]; boardCount: number };
type Group = { id: string; name: string; regionId: string | null; memberIds: string[]; boardIds: string[] };
type UserOpt = { id: string; name: string; role: "ADMIN" | "MANAGER" | "MEMBER" };
type BoardOpt = { id: string; name: string; regionId: string | null };

const sectionLabel =
  "mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-faint)]";
const chip = "inline-flex items-center gap-1 rounded-[7px] bg-[var(--color-accent-soft)] px-2 py-1 text-[12px] font-medium text-[var(--color-accent)]";

function MultiSelect({
  all,
  selected,
  onChange,
  addLabel,
}: {
  all: Opt[];
  selected: string[];
  onChange: (ids: string[]) => void;
  addLabel: string;
}) {
  const sel = all.filter((a) => selected.includes(a.id));
  const avail = all.filter((a) => !selected.includes(a.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sel.map((s) => (
        <span key={s.id} className={chip}>
          {s.name}
          <button onClick={() => onChange(selected.filter((x) => x !== s.id))} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </span>
      ))}
      {sel.length === 0 && <span className="text-[12px] text-[var(--color-faint)]">никого</span>}
      {avail.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
          className="h-7 rounded-[7px] border border-dashed border-[var(--color-border-input)] bg-[var(--color-surface)] px-1.5 text-[12px] text-[var(--color-muted)] outline-none"
        >
          <option value="">+ {addLabel}</option>
          {avail.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function OrgPanel({
  regions,
  groups,
  users,
  boards,
}: {
  regions: Region[];
  groups: Group[];
  users: UserOpt[];
  boards: BoardOpt[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newRegion, setNewRegion] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newGroupRegion, setNewGroupRegion] = useState<string>(regions[0]?.id ?? "");

  function run(p: Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await p;
      if (!res.ok) setError(res.error ?? "Ошибка");
      else setError(null);
      router.refresh();
    });
  }

  const userOpts: Opt[] = users.map((u) => ({ id: u.id, name: `${u.name} · ${roleLabels[u.role]}` }));
  const regionName = (id: string | null) => regions.find((r) => r.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-7 sm:px-9">
      <div className="mb-1.5 flex items-center gap-2.5">
        <h1 className="text-[24px] font-bold tracking-[-0.03em]">Регионы и группы</h1>
        <Link href="/admin" className="text-sm text-[var(--color-accent)] hover:underline">
          ← к доступу
        </Link>
      </div>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Директора создают регионы и назначают регионалов. Регионал ведёт доски своего региона.
        Доступ линейного персонала к доске — через группы, привязанные к этой доске.
      </p>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">
          {error}
        </div>
      )}

      {/* Regions */}
      <section className="mb-9">
        <h2 className={sectionLabel}>Регионы</h2>
        <div className="mb-3 flex gap-2">
          <input
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newRegion.trim() && (run(createRegion(newRegion.trim())), setNewRegion(""))}
            placeholder="Новый регион…"
            className="h-9 w-[260px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={() => newRegion.trim() && (run(createRegion(newRegion.trim())), setNewRegion(""))}
            className="rounded-[10px] bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white"
          >
            Создать
          </button>
        </div>
        <div className="space-y-2.5">
          {regions.map((r) => {
            const c = tint(r.color);
            return (
              <div key={r.id} className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] text-sm font-bold" style={{ background: c.bg, color: c.text }}>
                    {r.name.charAt(0)}
                  </span>
                  <input
                    defaultValue={r.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== r.name && run(renameRegion(r.id, e.target.value.trim()))}
                    className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold outline-none hover:border-[var(--color-border-input)] focus:border-[var(--color-accent)]"
                  />
                  <span className="text-[12px] text-[var(--color-faint)]">{r.boardCount} досок</span>
                  <button
                    onClick={() => confirm(`Удалить регион «${r.name}»? Доски и группы останутся, но без региона.`) && run(deleteRegion(r.id))}
                    className="text-[12px] text-[var(--color-urgent)] hover:underline"
                  >
                    Удалить
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-11">
                  <span className="text-[12px] text-[var(--color-muted)]">Регионалы:</span>
                  <MultiSelect
                    all={userOpts}
                    selected={r.managerIds}
                    onChange={(ids) => run(setRegionManagers(r.id, ids))}
                    addLabel="назначить"
                  />
                </div>
              </div>
            );
          })}
          {regions.length === 0 && <p className="text-sm text-[var(--color-muted)]">Регионов пока нет.</p>}
        </div>
      </section>

      {/* Groups */}
      <section>
        <h2 className={sectionLabel}>Группы доступа</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="Новая группа…"
            className="h-9 w-[220px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <select
            value={newGroupRegion}
            onChange={(e) => setNewGroupRegion(e.target.value)}
            className="h-9 rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-sm outline-none"
          >
            <option value="">Без региона</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={() => newGroup.trim() && (run(createGroup(newGroup.trim(), newGroupRegion || null)), setNewGroup(""))}
            className="rounded-[10px] bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white"
          >
            Создать
          </button>
        </div>
        <div className="space-y-2.5">
          {groups.map((g) => {
            const boardOpts: Opt[] = boards
              .filter((b) => !g.regionId || b.regionId === g.regionId)
              .map((b) => ({ id: b.id, name: b.name }));
            return (
              <div key={g.id} className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    defaultValue={g.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== g.name && run(renameGroup(g.id, e.target.value.trim()))}
                    className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold outline-none hover:border-[var(--color-border-input)] focus:border-[var(--color-accent)]"
                  />
                  <span className="text-[12px] text-[var(--color-faint)]">регион: {regionName(g.regionId)}</span>
                  <button
                    onClick={() => confirm(`Удалить группу «${g.name}»?`) && run(deleteGroup(g.id))}
                    className="text-[12px] text-[var(--color-urgent)] hover:underline"
                  >
                    Удалить
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="w-[80px] text-[12px] text-[var(--color-muted)]">Участники:</span>
                  <MultiSelect all={userOpts} selected={g.memberIds} onChange={(ids) => run(setGroupMembers(g.id, ids))} addLabel="добавить" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="w-[80px] text-[12px] text-[var(--color-muted)]">Доски:</span>
                  <MultiSelect all={boardOpts} selected={g.boardIds} onChange={(ids) => run(setGroupBoards(g.id, ids))} addLabel="привязать" />
                </div>
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-sm text-[var(--color-muted)]">Групп пока нет.</p>}
        </div>
      </section>
    </div>
  );
}

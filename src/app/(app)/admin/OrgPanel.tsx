"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { roleLabelsShort } from "@/lib/constants";
import { TAG_TINT_KEYS, tint } from "@/lib/tints";
import {
  createGroup,
  createGroupInvite,
  createPosition,
  createRegion,
  createRestaurant,
  deleteGroup,
  deletePosition,
  deleteRegion,
  deleteRestaurant,
  updateRestaurant,
  renameGroup,
  renameRegion,
  setBoardRegions,
  setGroupBoards,
  setGroupMembers,
  setRegionManagers,
} from "./org-actions";

type Role = "ADMIN" | "MANAGER" | "MEMBER";
type Opt = { id: string; name: string };
type Region = { id: string; name: string; color: string; managerIds: string[]; boardCount: number };
type Group = { id: string; name: string; regionId: string | null; memberIds: string[]; boardIds: string[] };
type UserOpt = { id: string; name: string; role: Role };
type BoardOpt = { id: string; name: string; regionIds: string[] };
type PositionOpt = { id: string; name: string; role: Role; color: string };
type RestaurantOpt = { id: string; name: string; iikoDepartmentId: string; active: boolean; regionId: string };

const ALL_ROLES: Role[] = ["MEMBER", "MANAGER", "ADMIN"];
const roleTier = (r: Role) => (r === "ADMIN" ? 2 : r === "MANAGER" ? 1 : 0);

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
  positions,
  restaurants,
  canManageRegions,
  actorTier,
}: {
  regions: Region[];
  groups: Group[];
  users: UserOpt[];
  boards: BoardOpt[];
  positions: PositionOpt[];
  restaurants: RestaurantOpt[];
  canManageRegions: boolean;
  actorTier: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newRegion, setNewRegion] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newGroupRegion, setNewGroupRegion] = useState<string>(regions[0]?.id ?? "");
  const [newPosition, setNewPosition] = useState("");
  const [newPositionRole, setNewPositionRole] = useState<Role>("MEMBER");
  const [newPositionColor, setNewPositionColor] = useState<string>("gray");
  const [newResto, setNewResto] = useState({ name: "", regionId: "", dept: "" });
  const [invite, setInvite] = useState<{ groupId: string; url: string } | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>("ALL"); // "ALL" | "NONE" | regionId

  const assignablePositionRoles = ALL_ROLES.filter((r) => roleTier(r) < actorTier);

  function genGroupInvite(groupId: string) {
    startTransition(async () => {
      const res = await createGroupInvite(groupId);
      if (res.ok && res.url) {
        setInvite({ groupId, url: res.url });
        try {
          await navigator.clipboard?.writeText(res.url);
        } catch {
          /* clipboard blocked */
        }
      } else setError(res.error ?? "Ошибка");
    });
  }

  function run(p: Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await p;
      if (!res.ok) setError(res.error ?? "Ошибка");
      else setError(null);
      router.refresh();
    });
  }

  const userOpts: Opt[] = users.map((u) => ({ id: u.id, name: `${u.name} · ${roleLabelsShort[u.role]}` }));
  const regionName = (id: string | null) => regions.find((r) => r.id === id)?.name ?? "—";

  const visibleGroups = groups.filter((g) =>
    groupFilter === "ALL"
      ? true
      : groupFilter === "NONE"
        ? g.regionId === null
        : g.regionId === groupFilter,
  );

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-7 sm:px-9">
      <div className="mb-1.5 flex items-center gap-2.5">
        <h1 className="text-[24px] font-bold tracking-[-0.03em]">Регионы и группы</h1>
        <Link href="/admin" className="text-sm text-[var(--color-accent)] hover:underline">
          ← к доступу
        </Link>
      </div>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Директора создают регионы и назначают региональных управляющих. Региональный управляющий
        ведёт доски своего региона. Доступ линейного персонала к доске — через группы, привязанные
        к этой доске.
      </p>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-sm text-[var(--color-urgent)]">
          {error}
        </div>
      )}

      {/* Regions */}
      <section className="mb-9">
        <h2 className={sectionLabel}>{canManageRegions ? "Регионы" : "Мои регионы"}</h2>
        {canManageRegions && (
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
        )}
        <div className="space-y-2.5">
          {regions.map((r) => {
            const c = tint(r.color);
            return (
              <div key={r.id} className="rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface)] p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] text-sm font-bold" style={{ background: c.bg, color: c.text }}>
                    {r.name.charAt(0)}
                  </span>
                  {canManageRegions ? (
                    <input
                      defaultValue={r.name}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== r.name && run(renameRegion(r.id, e.target.value.trim()))}
                      className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold outline-none hover:border-[var(--color-border-input)] focus:border-[var(--color-accent)]"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 px-1 text-[15px] font-semibold">{r.name}</span>
                  )}
                  <span className="text-[12px] text-[var(--color-faint)]">{r.boardCount} досок</span>
                  {canManageRegions && (
                    <button
                      onClick={() => confirm(`Удалить регион «${r.name}»? Доски и группы останутся, но без региона.`) && run(deleteRegion(r.id))}
                      className="text-[12px] text-[var(--color-urgent)] hover:underline"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                {canManageRegions && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-11">
                    <span className="text-[12px] text-[var(--color-muted)]">Управляющие:</span>
                    <MultiSelect
                      all={userOpts}
                      selected={r.managerIds}
                      onChange={(ids) => run(setRegionManagers(r.id, ids))}
                      addLabel="назначить"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {regions.length === 0 && <p className="text-sm text-[var(--color-muted)]">Регионов пока нет.</p>}
        </div>
      </section>

      {/* Boards ↔ regions (directors only) — a board may span several regions */}
      {canManageRegions && boards.length > 0 && (
        <section className="mb-9">
          <h2 className={sectionLabel}>Доски и регионы</h2>
          <p className="mb-3 text-[13px] text-[var(--color-muted)]">
            Доска может относиться к нескольким регионам — управляющие всех этих регионов её видят и ведут.
            Без региона — доступ только через группы.
          </p>
          <div className="space-y-2">
            {boards.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-2.5">
                <span className="min-w-[120px] flex-1 truncate text-sm font-medium">{b.name}</span>
                <MultiSelect
                  all={regions.map((r) => ({ id: r.id, name: r.name }))}
                  selected={b.regionIds}
                  onChange={(ids) => run(setBoardRegions(b.id, ids))}
                  addLabel="регион"
                />
              </div>
            ))}
          </div>
        </section>
      )}

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
        {regions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[{ id: "ALL", name: "Все" }, ...regions.map((r) => ({ id: r.id, name: r.name })), { id: "NONE", name: "Без региона" }].map((f) => (
              <button
                key={f.id}
                onClick={() => setGroupFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                  groupFilter === f.id
                    ? "bg-[var(--color-sidebar)] text-white"
                    : "bg-[var(--color-surface-warm)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2.5">
          {visibleGroups.map((g) => {
            const boardOpts: Opt[] = boards
              .filter((b) => !g.regionId || b.regionIds.includes(g.regionId))
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
                    onClick={() => genGroupInvite(g.id)}
                    className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Пригласить
                  </button>
                  <button
                    onClick={() => confirm(`Удалить группу «${g.name}»?`) && run(deleteGroup(g.id))}
                    className="text-[12px] text-[var(--color-urgent)] hover:underline"
                  >
                    Удалить
                  </button>
                </div>
                {invite?.groupId === g.id && (
                  <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] px-2.5 py-1.5">
                    <span className="text-[11px] text-[var(--color-muted)]">Ссылка (роль «Линейный», в эту группу):</span>
                    <input
                      readOnly
                      value={invite.url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-[var(--color-muted)] outline-none"
                    />
                  </div>
                )}
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
          {visibleGroups.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              {groups.length === 0 ? "Групп пока нет." : "В этом фильтре групп нет."}
            </p>
          )}
        </div>
      </section>

      {/* Positions — constructor: name + access level + colour (directors only) */}
      {canManageRegions && (
      <section className="mt-9">
        <h2 className={sectionLabel}>Конструктор должностей</h2>
        <p className="mb-3 text-[13px] text-[var(--color-muted)]">
          Каждая должность несёт уровень доступа и цвет. Назначается пользователям в «Управление
          доступом»; права определяются уровнем (Директор / Региональный / Линейный).
        </p>

        <div className="mb-4 rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newPosition.trim() && (run(createPosition(newPosition.trim(), newPositionRole, newPositionColor)), setNewPosition(""))}
              placeholder="Название должности…"
              className="h-9 w-[240px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={newPositionRole}
              onChange={(e) => setNewPositionRole(e.target.value as Role)}
              className="h-9 rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              {assignablePositionRoles.map((r) => (
                <option key={r} value={r}>{roleLabelsShort[r]}</option>
              ))}
            </select>
            <button
              onClick={() => newPosition.trim() && (run(createPosition(newPosition.trim(), newPositionRole, newPositionColor)), setNewPosition(""))}
              className="ml-auto rounded-[10px] bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white"
            >
              Создать должность
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[12px] text-[var(--color-muted)]">Цвет:</span>
            {TAG_TINT_KEYS.map((key) => {
              const c = tint(key);
              return (
                <button
                  key={key}
                  onClick={() => setNewPositionColor(key)}
                  aria-label={key}
                  className={`h-6 w-6 rounded-full transition ${newPositionColor === key ? "ring-2 ring-[var(--color-accent)] ring-offset-1" : ""}`}
                  style={{ background: c.bg, border: `1px solid ${c.text}` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {positions.map((p) => {
            const c = tint(p.color);
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[13px] font-medium"
                style={{ background: c.bg, color: c.text, borderColor: c.text }}
              >
                {p.name}
                <span className="rounded bg-white/45 px-1 text-[10px] font-semibold">{roleLabelsShort[p.role]}</span>
                <button onClick={() => confirm(`Удалить должность «${p.name}»?`) && run(deletePosition(p.id))} className="opacity-60 hover:opacity-100">
                  ✕
                </button>
              </span>
            );
          })}
          {positions.length === 0 && <p className="text-sm text-[var(--color-muted)]">Должностей пока нет.</p>}
        </div>
      </section>
      )}

      {/* iiko sales points (directors only) — powers the «Статистика» tab */}
      {canManageRegions && (
      <section className="mt-9">
        <h2 className={sectionLabel}>Точки iiko (для «Статистики»)</h2>
        <p className="mb-3 text-[13px] text-[var(--color-muted)]">
          Привяжи точку к региону и её ID подразделения в iiko OLAP. Региональный управляющий видит в
          «Статистике» только точки своих регионов, директор — все.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[13px] border border-[var(--color-border-card)] bg-[var(--color-surface-warm)] p-3.5">
          <input
            value={newResto.name}
            onChange={(e) => setNewResto({ ...newResto, name: e.target.value })}
            placeholder="Название точки"
            className="h-9 w-[200px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <select
            value={newResto.regionId}
            onChange={(e) => setNewResto({ ...newResto, regionId: e.target.value })}
            className="h-9 rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">— регион —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            value={newResto.dept}
            onChange={(e) => setNewResto({ ...newResto, dept: e.target.value })}
            placeholder="ID подразделения iiko"
            className="h-9 w-[200px] rounded-[10px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 font-mono text-[12.5px] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={() =>
              newResto.name.trim() && newResto.regionId && newResto.dept.trim() &&
              (run(createRestaurant(newResto.name.trim(), newResto.regionId, newResto.dept.trim())), setNewResto({ name: "", regionId: "", dept: "" }))
            }
            className="ml-auto rounded-[10px] bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white"
          >
            Добавить точку
          </button>
        </div>

        <div className="space-y-2">
          {restaurants.map((rt) => (
            <div key={rt.id} className={`flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--color-border-card)] bg-[var(--color-surface)] px-3.5 py-2.5 ${rt.active ? "" : "opacity-60"}`}>
              <input
                defaultValue={rt.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== rt.name && run(updateRestaurant(rt.id, { name: e.target.value.trim() }))}
                className="h-8 min-w-[140px] flex-1 rounded-[8px] border border-transparent bg-transparent px-1.5 text-[14px] font-medium outline-none hover:border-[var(--color-border-input)] focus:border-[var(--color-accent)]"
              />
              <select
                value={rt.regionId}
                onChange={(e) => run(updateRestaurant(rt.id, { regionId: e.target.value }))}
                className="h-8 rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input
                defaultValue={rt.iikoDepartmentId}
                onBlur={(e) => e.target.value.trim() && e.target.value !== rt.iikoDepartmentId && run(updateRestaurant(rt.id, { iikoDepartmentId: e.target.value.trim() }))}
                title="ID подразделения в iiko OLAP"
                className="h-8 w-[190px] rounded-[8px] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-2 font-mono text-[12px] text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
              />
              <button
                onClick={() => run(updateRestaurant(rt.id, { active: !rt.active }))}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${rt.active ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-line)] text-[var(--color-muted)]"}`}
              >
                {rt.active ? "активна" : "скрыта"}
              </button>
              <button
                onClick={() => confirm(`Удалить точку «${rt.name}»?`) && run(deleteRestaurant(rt.id))}
                className="text-[var(--color-faint)] hover:text-[var(--color-urgent)]"
              >
                ✕
              </button>
            </div>
          ))}
          {restaurants.length === 0 && <p className="text-sm text-[var(--color-muted)]">Точек пока нет.</p>}
        </div>
      </section>
      )}
    </div>
  );
}

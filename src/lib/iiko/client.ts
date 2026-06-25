// iikoServer / iikoOffice OLAP API client. The server-API licence is limited by
// concurrent sessions, so the auth token is cached (not re-fetched per request).
//
// ENV:
//   IIKO_BASE_URL=https://<host>            // iikoServer host, WITHOUT /resto
//   IIKO_LOGIN=apiuser
//   IIKO_PASS_SHA1=<sha1(password) hex>     // pre-hashed password
//   IIKO_ORDER_TYPE_MAP={"Ресторан":"hall","Доставка курьером":"delivery","Самовывоз":"pickup"}

const BASE = process.env.IIKO_BASE_URL?.replace(/\/$/, "");
const LOGIN = process.env.IIKO_LOGIN;
const PASS_SHA1 = process.env.IIKO_PASS_SHA1;

/** True only when all iiko env vars are set — the dashboard degrades gracefully
 *  (zeroed metrics + "iiko не настроена" notice) when they aren't. */
export function iikoConfigured(): boolean {
  return Boolean(BASE && LOGIN && PASS_SHA1);
}

let cached: { token: string; at: number } | null = null;
const TOKEN_TTL = 15 * 60_000; // 15 min — well under typical session limits

async function getToken(): Promise<string> {
  if (cached && Date.now() - cached.at < TOKEN_TTL) return cached.token;
  const res = await fetch(`${BASE}/resto/api/auth?login=${encodeURIComponent(LOGIN!)}&pass=${PASS_SHA1}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`iiko auth failed: ${res.status}`);
  const token = (await res.text()).trim();
  cached = { token, at: Date.now() };
  return token;
}

export type OlapRow = Record<string, string | number>;

export type OlapBody = {
  reportType: "SALES" | "TRANSACTIONS" | "STOCK" | "DELIVERIES";
  groupByRowFields: string[];
  aggregateFields: string[];
  filters: Record<string, unknown>; // iikoServer OLAP v2 expects `filters` (plural)
};

/** Low-level OLAP v2 request. Retries once if the cached token has expired. */
export async function olap(body: OlapBody, _retry = false): Promise<OlapRow[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/resto/api/v2/reports/olap?key=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401 && !_retry) {
    cached = null;
    return olap(body, true);
  }
  if (!res.ok) throw new Error(`iiko olap failed: ${res.status}`);
  const json = (await res.json()) as { data?: OlapRow[] };
  return json.data ?? [];
}

export type IikoDept = { id: string; name: string };

const unescapeXml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

/** Sales points (type=DEPARTMENT) from the corporation tree. The `name` is what
 *  OLAP returns in the `Department` column, so it's what we store/match against. */
export async function listDepartments(): Promise<IikoDept[]> {
  if (!iikoConfigured()) return [];
  const token = await getToken();
  const res = await fetch(`${BASE}/resto/api/corporation/departments?key=${token}&revisionFrom=-1`, { cache: "no-store" });
  if (!res.ok) throw new Error(`iiko departments failed: ${res.status}`);
  const xml = await res.text();
  const out: IikoDept[] = [];
  for (const m of xml.matchAll(/<corporateItemDto>([\s\S]*?)<\/corporateItemDto>/g)) {
    if (!/<type>DEPARTMENT<\/type>/.test(m[1])) continue;
    const id = m[1].match(/<id>(.*?)<\/id>/)?.[1];
    const name = m[1].match(/<name>(.*?)<\/name>/)?.[1];
    if (id && name) out.push({ id, name: unescapeXml(name) });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return out;
}

/** Parse the city + clean point name out of an iiko department name.
 *  Convention in this network: "ПИМС <Город> - <Точка> (<ЮрЛицо>)".
 *  The separator is a dash *surrounded by spaces*, so a hyphen inside the city
 *  ("Южно-Сахалинск") or point ("Пр-кт Красного Знамени") is preserved.
 *  Returns city=null when the name doesn't follow the convention. */
export function parseIikoPoint(rawName: string): { city: string | null; point: string } {
  const name = rawName.trim();
  const m = name.match(/^Пимс\s+(.+?)\s+[-–—]\s+(.+?)\s*(?:\(.*\))?\s*$/i);
  if (!m) return { city: null, point: name };
  return { city: m[1].trim(), point: m[2].trim() };
}

export type IikoSalesPoint = { name: string; jur: string | null; disabled: boolean };

/** All sales points (type=DEPARTMENT) with their parent legal entity (JURPERSON)
 *  name and a "disabled" flag (iiko marks retired points with a "###" prefix and
 *  uses "(под будущие точки)" placeholders). Powers the «Импорт из iiko» action,
 *  which filters by legal entity so a shared/franchise iiko doesn't pull in other
 *  tenants' points. */
export async function listSalesPoints(): Promise<IikoSalesPoint[]> {
  if (!iikoConfigured()) return [];
  const token = await getToken();
  const res = await fetch(`${BASE}/resto/api/corporation/departments?key=${token}&revisionFrom=-1`, { cache: "no-store" });
  if (!res.ok) throw new Error(`iiko departments failed: ${res.status}`);
  const xml = await res.text();
  // Index every node by id so a DEPARTMENT can resolve its parent JURPERSON name.
  const nodes = new Map<string, { name: string; type: string; parentId: string | null }>();
  for (const m of xml.matchAll(/<corporateItemDto>([\s\S]*?)<\/corporateItemDto>/g)) {
    const b = m[1];
    const id = b.match(/<id>(.*?)<\/id>/)?.[1];
    if (!id) continue;
    const name = unescapeXml(b.match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? "");
    const type = b.match(/<type>(.*?)<\/type>/)?.[1] ?? "";
    const parentId = b.match(/<parentId>(.*?)<\/parentId>/)?.[1] ?? null;
    nodes.set(id, { name, type, parentId });
  }
  const out: IikoSalesPoint[] = [];
  for (const n of nodes.values()) {
    if (n.type !== "DEPARTMENT") continue;
    const parent = n.parentId ? nodes.get(n.parentId) : null;
    const disabled = /^###/.test(n.name) || /под будущие/i.test(n.name);
    out.push({ name: n.name, jur: parent?.name ?? null, disabled });
  }
  return out;
}

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
  reportType: "SALES" | "DELETIONS" | "TRANSACTIONS";
  groupByRowFields: string[];
  aggregateFields: string[];
  filter: Record<string, unknown>;
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

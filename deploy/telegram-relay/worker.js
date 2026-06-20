// Cloudflare Worker — Telegram Bot API relay + dead-man's switch.
//
// 1) RELAY: from a Russian IP api.telegram.org is DPI-blocked; Cloudflare is
//    reachable, so we proxy every Bot API call. Point the app/bot at it with
//    TELEGRAM_API_ROOT=https://<worker-subdomain>.workers.dev
//
// 2) DEAD-MAN'S SWITCH: the mini-PC can't be reached from outside (inbound RU
//    block), so we can't health-check it directly. Instead the bot POSTs
//    /heartbeat every few minutes (outbound works). A cron checks the last beat
//    and, if it's stale, alerts Telegram — this catches "the whole box is down".
//
// Setup (once), from deploy/telegram-relay on a machine with wrangler login:
//   npx wrangler kv namespace create HEARTBEAT   # paste the id into wrangler.toml
//   npx wrangler secret put ALERT_BOT_TOKEN      # the bot token
//   npx wrangler secret put ALERT_CHAT_ID        # chat to alert (e.g. director's)
//   npx wrangler deploy
//
// Security: the relay is open, but a request only does anything with a valid
// /bot<TOKEN>/... path, so it's as safe as the token. Set RELAY_KEY to gate it.

const STALE_MS = 8 * 60 * 1000; // alert if no heartbeat for this long

async function tg(env, text) {
  if (!env.ALERT_BOT_TOKEN || !env.ALERT_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.ALERT_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.ALERT_CHAT_ID, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "") {
      return new Response("Telegram relay OK", { status: 200 });
    }

    // Dead-man's-switch heartbeat: the bot pings this to prove it's alive.
    if (url.pathname === "/heartbeat") {
      if (env.HEARTBEAT) {
        await env.HEARTBEAT.put("last_beat", String(Date.now()));
        await env.HEARTBEAT.delete("down"); // any beat clears the down flag
      }
      return new Response("ok", { status: 200 });
    }

    // Optional shared-secret gate.
    if (env.RELAY_KEY && url.searchParams.get("key") !== env.RELAY_KEY) {
      return new Response("forbidden", { status: 403 });
    }
    url.searchParams.delete("key");

    const target = "https://api.telegram.org" + url.pathname + (url.search || "");
    const init = {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
    };

    const resp = await fetch(target, init);
    // Buffer the body and return clean headers. Streaming the body straight
    // through makes grammY's Node HTTP client throw ERR_STREAM_PREMATURE_CLOSE,
    // so the bot's getUpdates never completes.
    const buf = await resp.arrayBuffer();
    const headers = new Headers(resp.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    return new Response(buf, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  },

  // Cron: alert when the heartbeat goes stale, and once when it recovers.
  async scheduled(_event, env, _ctx) {
    if (!env.HEARTBEAT) return;
    const last = Number((await env.HEARTBEAT.get("last_beat")) || 0);
    if (last === 0) return; // never seen a beat yet → don't alert on cold start
    const down = await env.HEARTBEAT.get("down");
    const stale = Date.now() - last > STALE_MS;
    if (stale && !down) {
      await env.HEARTBEAT.put("down", "1");
      const mins = Math.round((Date.now() - last) / 60000);
      await tg(env, `🔴 <b>Поток недоступен</b>\nМини-ПК/бот не выходит на связь уже ~${mins} мин. Проверьте сервер.`);
    } else if (!stale && down) {
      await env.HEARTBEAT.delete("down");
      await tg(env, "🟢 <b>Поток на связи</b> — мини-ПК снова отвечает.");
    }
  },
};

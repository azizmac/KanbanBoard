// Cloudflare Worker — reverse proxy for the Telegram Bot API.
//
// Why: from a Russian IP, api.telegram.org is blocked by DPI. Cloudflare is
// reachable, so we relay every Bot API call through this Worker. Point the app
// at it with  TELEGRAM_API_ROOT=https://<worker-subdomain>.workers.dev
//
// The app already routes through TELEGRAM_API_ROOT (grammY apiRoot + sendTelegram),
// so no code change is needed — just deploy this and set the env var.
//
// Deploy:
//   cd deploy/telegram-relay
//   npx wrangler login        # opens browser, free Cloudflare account
//   npx wrangler deploy       # prints https://tg-relay.<you>.workers.dev
//
// Security note: this is an open relay for the Telegram API. A request only does
// anything if it carries a valid /bot<TOKEN>/... path, so it's effectively as
// safe as your bot token. Set RELAY_KEY (a wrangler secret) to additionally
// require a ?key=... query param; leave it unset to keep the relay open.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "") {
      return new Response("Telegram relay OK", { status: 200 });
    }

    // Inbound webhook from Telegram → forward to the app origin. Cloudflare→origin
    // is generic HTTPS (not Telegram-flagged), so it bypasses the RU-side block
    // that makes Telegram time out talking to the mini-PC directly.
    if (url.pathname === "/hook") {
      const origin = (env.WEBHOOK_ORIGIN || "https://kanban.freshdv.ru").replace(/\/$/, "");
      const resp = await fetch(origin + "/api/telegram/webhook", {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "follow",
      });
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      });
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
};

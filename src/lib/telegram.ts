/** Thin wrapper over the Telegram Bot API. No-ops when no token is set. */

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

// Override with a reverse-proxy base (e.g. for networks where api.telegram.org
// is unreachable). Defaults to the official endpoint.
const API = (process.env.TELEGRAM_API_ROOT || "https://api.telegram.org").replace(/\/$/, "");

export async function sendTelegram(chatId: string, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text());
    }
    return res.ok;
  } catch (e) {
    console.error("[telegram] send error:", e);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

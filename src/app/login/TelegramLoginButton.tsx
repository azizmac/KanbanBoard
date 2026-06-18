"use client";

import { useEffect, useRef } from "react";

/** Renders the official Telegram Login Widget. Redirects to /api/auth/telegram. */
export default function TelegramLoginButton({ botUsername }: { botUsername: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-auth-url", "/api/auth/telegram");
    script.setAttribute("data-request-access", "write");
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [botUsername]);

  return <div ref={ref} className="flex justify-center" />;
}

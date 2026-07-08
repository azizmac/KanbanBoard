"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// One SSE connection per open chat UI: "change" → debounced router.refresh(),
// "typing:<chatId>:<name>" → transient indicator consumed via context.

type TypingMap = Record<string, { name: string; until: number }>;

const ChatLiveContext = createContext<{ typing: TypingMap }>({ typing: {} });

export function useTyping(chatId: string): string | null {
  const { typing } = useContext(ChatLiveContext);
  // expired entries are pruned by the provider's GC interval, so no clock
  // check here (render must stay pure)
  const t = typing[chatId];
  return t ? t.name : null;
}

export function ChatLiveProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [typing, setTyping] = useState<TypingMap>({});
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return; // debounce bursts
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, 120);
  }, [router]);

  useEffect(() => {
    const es = new EventSource("/api/chat/events");
    es.onmessage = (e) => {
      const data: string = e.data;
      if (data === "change") {
        scheduleRefresh();
        return;
      }
      if (data.startsWith("typing:")) {
        const rest = data.slice("typing:".length);
        const sep = rest.indexOf(":");
        if (sep < 0) return;
        const chatId = rest.slice(0, sep);
        const name = rest.slice(sep + 1);
        setTyping((prev) => ({ ...prev, [chatId]: { name, until: Date.now() + 4000 } }));
      }
    };
    // expire typing badges
    const gc = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const alive = Object.entries(prev).filter(([, v]) => v.until > now);
        return alive.length === Object.keys(prev).length ? prev : Object.fromEntries(alive);
      });
    }, 1500);
    return () => {
      es.close();
      clearInterval(gc);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  const value = useMemo(() => ({ typing }), [typing]);
  return <ChatLiveContext.Provider value={value}>{children}</ChatLiveContext.Provider>;
}

"use client";

import { Avatar } from "@/components/Avatar";
import { tint } from "@/lib/tints";
import type { ChatPeer } from "@/lib/chat-data";

/** Direct chat → the peer's avatar (round); group → tinted rounded square with
 *  the first letter of the name, as in the design. */
export function ChatAvatar({
  type,
  title,
  color,
  peer,
  size = 46,
}: {
  type: "DIRECT" | "GROUP";
  title: string;
  color: string;
  peer: ChatPeer | null;
  size?: number;
}) {
  if (type === "DIRECT") {
    return <Avatar name={peer?.name ?? title} src={peer?.avatarUrl} size={size} />;
  }
  const t = tint(color);
  return (
    <span
      className="inline-grid shrink-0 place-items-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.round(size * 0.4),
        background: t.bg,
        color: t.text,
      }}
    >
      {(title.trim().charAt(0) || "Г").toUpperCase()}
    </span>
  );
}

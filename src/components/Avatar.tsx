import { avatarTint } from "@/lib/tints";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  src,
  size = 32,
  className = "",
  title,
  ring = false,
}: {
  name: string;
  /** photo URL (e.g. /api/avatar/<id>); falls back to initials when absent */
  src?: string | null;
  size?: number;
  className?: string;
  title?: string;
  /** white 2px ring, for overlapping stacks */
  ring?: boolean;
}) {
  const shadow = ring ? "0 0 0 2px var(--color-surface)" : undefined;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        title={title ?? name}
        className={`inline-block shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size, boxShadow: shadow }}
      />
    );
  }
  const { bg, text } = avatarTint(name);
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: bg,
        color: text,
        boxShadow: shadow,
      }}
      title={title ?? name}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping row of avatars with a "+N" overflow chip. */
export function AvatarStack({
  names,
  size = 24,
  max = 3,
}: {
  names: string[];
  size?: number;
  max?: number;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const overlap = Math.round(size * 0.3);
  return (
    <div className="flex">
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} style={{ marginLeft: i === 0 ? 0 : -overlap }}>
          <Avatar name={n} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-grid place-items-center rounded-full font-semibold"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            fontSize: Math.round(size * 0.38),
            background: "#F2F4F7",
            color: "#667085",
            boxShadow: "0 0 0 2px var(--color-surface)",
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

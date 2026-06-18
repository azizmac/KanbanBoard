const palette = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-orange-500",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

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
  size = 32,
  className = "",
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const color = palette[hash(name) % palette.length];
  return (
    <span
      className={`${color} inline-grid shrink-0 place-items-center rounded-full font-medium text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      title={title ?? name}
    >
      {initials(name)}
    </span>
  );
}

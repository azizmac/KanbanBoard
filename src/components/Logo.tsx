// «Поток» brand mark — three rising board columns (task progress) + a card dot.
// Claude-style terracotta palette. Geometry from the design handoff (viewBox 100×100).

export function LogoMark({
  size = 28,
  tone = "light",
}: {
  size?: number;
  /** "light" = on light bg; "dark" = on dark bg (graphite/ink) */
  tone?: "light" | "dark";
}) {
  const cols = tone === "dark" ? ["#E0A082", "#EBA886", "#ffffff"] : ["#EBC3B0", "#E0A082", "#D97757"];
  const dot = tone === "dark" ? "#D97757" : "#1F1E1D";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="6" y="56" width="22" height="38" rx="7" fill={cols[0]} />
      <rect x="33" y="34" width="22" height="60" rx="7" fill={cols[1]} />
      <rect x="60" y="12" width="22" height="82" rx="7" fill={cols[2]} />
      <circle cx="71" cy="12" r="9" fill={dot} />
    </svg>
  );
}

/** App-icon lockup: terracotta rounded square with three white columns. */
export function LogoIcon({ size = 34 }: { size?: number }) {
  const r = Math.round(size * 0.26);
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size, borderRadius: r, background: "#D97757" }}
    >
      <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect x="14" y="56" width="18" height="34" rx="6" fill="#fff" opacity="0.55" />
        <rect x="40" y="38" width="18" height="52" rx="6" fill="#fff" opacity="0.8" />
        <rect x="66" y="20" width="18" height="70" rx="6" fill="#fff" />
      </svg>
    </span>
  );
}

/** Mark + "Поток" wordmark. */
export function LogoLockup({ size = 30, tone = "light" }: { size?: number; tone?: "light" | "dark" }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} tone={tone} />
      <span
        className="font-bold tracking-[-0.03em]"
        style={{ fontSize: Math.round(size * 0.6), color: tone === "dark" ? "#ffffff" : "#1F1E1D" }}
      >
        Поток
      </span>
    </div>
  );
}

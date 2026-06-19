// Shared tint palette from the design handoff: soft background + saturated text.
// Used for avatars (picked by name hash), board badges, and tags (picked by key).

export type Tint = { bg: string; text: string };

export const TINTS: Record<string, Tint> = {
  purple: { bg: "#EADCFB", text: "#6D28D9" },
  blue: { bg: "#D6ECFF", text: "#1D6FD6" },
  pink: { bg: "#FCE3EC", text: "#C0357A" },
  green: { bg: "#DCF3E8", text: "#1B8A5A" },
  amber: { bg: "#FDEAD7", text: "#C2630F" },
  indigo: { bg: "#E5E4F5", text: "#4B49A8" },
  iris: { bg: "#ECEAFB", text: "#5546E0" },
  gray: { bg: "#F2F4F7", text: "#667085" },
};

// Ordered list used to assign a stable tint from a string (names, ids).
const AVATAR_KEYS = ["purple", "blue", "pink", "green", "amber", "indigo"] as const;

// Keys offered when picking a colour for a board or tag.
export const BOARD_TINT_KEYS = ["iris", "pink", "green", "amber", "blue", "purple"] as const;
export const TAG_TINT_KEYS = ["gray", "iris", "pink", "green", "amber", "blue", "purple"] as const;

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable tint for a person, derived from their name. */
export function avatarTint(name: string): Tint {
  return TINTS[AVATAR_KEYS[hashString(name) % AVATAR_KEYS.length]];
}

/** Tint for a named key (board.color / tag.color), falling back to gray. */
export function tint(key: string | null | undefined): Tint {
  return (key && TINTS[key]) || TINTS.gray;
}

/** Dedupe key for a 1:1 chat — order-independent. */
export function directChatKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

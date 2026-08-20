import { describe, expect, it } from "vitest";
import { directChatKey } from "./chat-key";

describe("directChatKey", () => {
  it("is order-independent", () => {
    expect(directChatKey("aaa", "zzz")).toBe(directChatKey("zzz", "aaa"));
  });

  it("joins with a colon", () => {
    expect(directChatKey("u1", "u2")).toBe("u1:u2");
  });

  it("does not collide for swapped-looking ids", () => {
    expect(directChatKey("ab", "c")).not.toBe(directChatKey("a", "bc"));
  });
});

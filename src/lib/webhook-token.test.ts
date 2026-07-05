import { describe, expect, it } from "vitest";
import { assignableUserWhere, canCreateWebhookToken } from "./access";
import { hashToken, isPersonalToken, newWebhookToken, TOKEN_PREFIX } from "./webhook-token";

const director = { id: "d", role: "ADMIN" as const };
const regional = { id: "r", role: "MANAGER" as const };
const member = { id: "m", role: "MEMBER" as const };

describe("webhook token", () => {
  it("mints a gsk_ token whose SHA-256 hash matches", () => {
    const { plain, hash } = newWebhookToken();
    expect(plain.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(isPersonalToken(plain)).toBe(true);
    expect(hashToken(plain)).toBe(hash);
    expect(hash).toHaveLength(64);
  });

  it("hash is deterministic and never equals the plaintext", () => {
    expect(hashToken("gsk_abc")).toBe(hashToken("gsk_abc"));
    expect(hashToken("gsk_abc")).not.toBe("gsk_abc");
  });

  it("a global secret is not treated as a personal token", () => {
    expect(isPersonalToken("bed13fd9463d54f1b4945aeebaea4f23")).toBe(false);
  });
});

describe("webhook token permissions & assignee scope", () => {
  it("only directors and regionals may mint tokens", () => {
    expect(canCreateWebhookToken(director)).toBe(true);
    expect(canCreateWebhookToken(regional)).toBe(true);
    expect(canCreateWebhookToken(member)).toBe(false);
  });

  it("a director may assign to any active user", () => {
    expect(assignableUserWhere(director)).toEqual({ active: true });
  });

  it("a regional is scoped to self, direct reports, and their region's members", () => {
    const w = assignableUserWhere(regional);
    expect(w.active).toBe(true);
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { id: "r" },
        { managerId: "r" },
        { groups: { some: { region: { managers: { some: { id: "r" } } } } } },
      ]),
    );
  });

  it("a linear member gets an impossible where (assigns to nobody)", () => {
    expect(assignableUserWhere(member)).toEqual({ id: "__none__" });
  });
});

import { describe, expect, it } from "vitest";
import { makeBoardLinkCode, verifyBoardLinkCode } from "./board-link";
import { makeInviteToken, verifyInviteToken } from "./invite";
import { makeLinkToken, verifyLinkToken } from "./telegram-link";

// Replace the first char with a guaranteed-different one (a tamper that always
// changes the signature).
const flipFirst = (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1);

describe("invite tokens", () => {
  it("round-trips each role + groupId", () => {
    for (const role of ["MEMBER", "MANAGER", "ADMIN"] as const) {
      const tok = makeInviteToken(role, 7, "grp_1");
      const v = verifyInviteToken(tok);
      expect(v).toEqual({ role, groupId: "grp_1" });
    }
  });

  it("defaults to MEMBER with no group", () => {
    expect(verifyInviteToken(makeInviteToken())).toEqual({ role: "MEMBER", groupId: null });
  });

  it("rejects an expired token", () => {
    expect(verifyInviteToken(makeInviteToken("MEMBER", -1))).toBeNull();
  });

  it("rejects a tampered token", () => {
    expect(verifyInviteToken(flipFirst(makeInviteToken("ADMIN", 7)))).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyInviteToken("not-a-token")).toBeNull();
    expect(verifyInviteToken("")).toBeNull();
  });
});

describe("board-link codes", () => {
  it("round-trips a board id", () => {
    expect(verifyBoardLinkCode(makeBoardLinkCode("cmql7ayb3000201pn1wmak7mu"))).toBe(
      "cmql7ayb3000201pn1wmak7mu",
    );
  });

  it("is Telegram startgroup-safe (only A-Za-z0-9_-, <= 64 chars)", () => {
    const code = makeBoardLinkCode("cmql7ayb3000201pn1wmak7mu");
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThanOrEqual(64);
  });

  it("rejects a tampered code", () => {
    expect(verifyBoardLinkCode(flipFirst(makeBoardLinkCode("board123")))).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyBoardLinkCode("short")).toBeNull();
    expect(verifyBoardLinkCode("")).toBeNull();
  });
});

describe("telegram account-link tokens", () => {
  it("round-trips a user id", () => {
    expect(verifyLinkToken(makeLinkToken("user_abc"))).toBe("user_abc");
  });

  it("is valid as a Telegram start= param (A-Za-z0-9_-)", () => {
    expect(makeLinkToken("user_abc")).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects a tampered token", () => {
    expect(verifyLinkToken(flipFirst(makeLinkToken("user_abc")))).toBeNull();
  });
});

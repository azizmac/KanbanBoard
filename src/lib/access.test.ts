import { describe, expect, it } from "vitest";
import { actorTier, canAssignRole, canManageUser, roleTier } from "./access";

const owner = { id: "o", role: "ADMIN" as const, superAdmin: true };
const director = { id: "d", role: "ADMIN" as const };
const director2 = { id: "d2", role: "ADMIN" as const };
const regional = { id: "r", role: "MANAGER" as const };
const member = { id: "m", role: "MEMBER" as const };

describe("role/actor tiers", () => {
  it("orders superadmin > director > regional > linear", () => {
    expect(actorTier(owner)).toBe(3);
    expect(actorTier(director)).toBe(2);
    expect(actorTier(regional)).toBe(1);
    expect(actorTier(member)).toBe(0);
    expect(roleTier("ADMIN")).toBe(2);
    expect(roleTier("MANAGER")).toBe(1);
    expect(roleTier("MEMBER")).toBe(0);
  });
});

describe("canManageUser — strictly-higher tier only", () => {
  it("nobody can touch the owner — not even the owner", () => {
    for (const a of [owner, director, regional, member]) {
      expect(canManageUser(a, owner)).toBe(false);
    }
  });

  it("the owner can manage every non-owner", () => {
    expect(canManageUser(owner, director)).toBe(true);
    expect(canManageUser(owner, regional)).toBe(true);
    expect(canManageUser(owner, member)).toBe(true);
  });

  it("directors cannot deactivate/change each other or themselves", () => {
    expect(canManageUser(director, director2)).toBe(false);
    expect(canManageUser(director, director)).toBe(false);
  });

  it("directors manage only regionals and linear staff", () => {
    expect(canManageUser(director, regional)).toBe(true);
    expect(canManageUser(director, member)).toBe(true);
  });

  it("a regional cannot reach peers or anyone above", () => {
    expect(canManageUser(regional, regional)).toBe(false);
    expect(canManageUser(regional, director)).toBe(false);
    expect(canManageUser(regional, member)).toBe(true);
  });
});

describe("canAssignRole — never promote to your level or above", () => {
  it("owner may mint directors", () => {
    expect(canAssignRole(owner, "ADMIN")).toBe(true);
    expect(canAssignRole(owner, "MANAGER")).toBe(true);
    expect(canAssignRole(owner, "MEMBER")).toBe(true);
  });

  it("a director may not create/grant another director", () => {
    expect(canAssignRole(director, "ADMIN")).toBe(false);
    expect(canAssignRole(director, "MANAGER")).toBe(true);
    expect(canAssignRole(director, "MEMBER")).toBe(true);
  });

  it("a regional may only grant linear", () => {
    expect(canAssignRole(regional, "MANAGER")).toBe(false);
    expect(canAssignRole(regional, "MEMBER")).toBe(true);
  });
});

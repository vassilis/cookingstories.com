import { describe, expect, it } from "vitest";
import { anonymous, canEdit, canView, isAuthor, isListed, type Viewer } from "./recipe-access";

type Fields = Parameters<typeof canView>[0];

const recipe = (overrides: Partial<Fields> = {}): Fields => ({
  visibility: "public",
  reviewStatus: "approved",
  authorId: "author",
  shareToken: null,
  ...overrides,
});

const author: Viewer = { userId: "author", isAdmin: false };
const other: Viewer = { userId: "someone-else", isAdmin: false };
const admin: Viewer = { userId: "admin", isAdmin: true };

describe("canView public recipes", () => {
  it("shows an approved recipe to everyone", () => {
    const r = recipe();
    expect(canView(r, anonymous)).toBe(true);
    expect(canView(r, other)).toBe(true);
  });

  it.each(["pending", "rejected"] as const)("hides a %s recipe from anonymous visitors and other users", (reviewStatus) => {
    const r = recipe({ reviewStatus });
    expect(canView(r, anonymous)).toBe(false);
    expect(canView(r, other)).toBe(false);
  });

  it.each(["pending", "rejected"] as const)("shows a %s recipe to its author and to admins", (reviewStatus) => {
    const r = recipe({ reviewStatus });
    expect(canView(r, author)).toBe(true);
    expect(canView(r, admin)).toBe(true);
  });
});

describe("canView private recipes", () => {
  const r = recipe({ visibility: "private" });

  it("shows it to the author and to admins", () => {
    expect(canView(r, author)).toBe(true);
    expect(canView(r, admin)).toBe(true);
  });

  it("hides it from everyone else", () => {
    expect(canView(r, anonymous)).toBe(false);
    expect(canView(r, other)).toBe(false);
  });
});

describe("canView link recipes", () => {
  const r = recipe({ visibility: "link", shareToken: "secret-token" });

  it("shows it with the exact share token", () => {
    expect(canView(r, { ...anonymous, shareToken: "secret-token" })).toBe(true);
  });

  it("hides it with a wrong token of the same length", () => {
    expect(canView(r, { ...anonymous, shareToken: "secret-tokeX" })).toBe(false);
  });

  it("hides it with a token of a different length", () => {
    expect(canView(r, { ...anonymous, shareToken: "secret" })).toBe(false);
    expect(canView(r, { ...anonymous, shareToken: "secret-token-and-more" })).toBe(false);
  });

  it("hides it without a token", () => {
    expect(canView(r, anonymous)).toBe(false);
    expect(canView(r, { ...anonymous, shareToken: null })).toBe(false);
    expect(canView(r, { ...anonymous, shareToken: "" })).toBe(false);
  });

  it("hides it when the recipe has no token, even if the visitor sends one", () => {
    const noToken = recipe({ visibility: "link", shareToken: null });
    expect(canView(noToken, { ...anonymous, shareToken: "anything" })).toBe(false);
    expect(canView(noToken, { ...anonymous, shareToken: "" })).toBe(false);
  });

  it("still shows it to the author and to admins without a token", () => {
    expect(canView(r, author)).toBe(true);
    expect(canView(r, admin)).toBe(true);
  });
});

describe("share tokens only unlock link recipes", () => {
  it("does not unlock a private recipe", () => {
    const r = recipe({ visibility: "private", shareToken: "secret-token" });
    expect(canView(r, { ...anonymous, shareToken: "secret-token" })).toBe(false);
  });

  it("does not unlock a pending public recipe", () => {
    const r = recipe({ visibility: "public", reviewStatus: "pending", shareToken: "secret-token" });
    expect(canView(r, { ...anonymous, shareToken: "secret-token" })).toBe(false);
  });
});

describe("canEdit", () => {
  it("lets the author and admins edit", () => {
    expect(canEdit(recipe(), author)).toBe(true);
    expect(canEdit(recipe(), admin)).toBe(true);
  });

  it("stops other users and anonymous visitors", () => {
    expect(canEdit(recipe(), other)).toBe(false);
    expect(canEdit(recipe(), anonymous)).toBe(false);
  });

  it("lets only admins edit a house recipe with no author", () => {
    const house = recipe({ authorId: null });
    expect(canEdit(house, admin)).toBe(true);
    expect(canEdit(house, other)).toBe(false);
    expect(canEdit(house, anonymous)).toBe(false);
  });
});

describe("isListed", () => {
  it("is true only for public and approved", () => {
    expect(isListed({ visibility: "public", reviewStatus: "approved" })).toBe(true);
    expect(isListed({ visibility: "public", reviewStatus: "pending" })).toBe(false);
    expect(isListed({ visibility: "public", reviewStatus: "rejected" })).toBe(false);
    expect(isListed({ visibility: "link", reviewStatus: "approved" })).toBe(false);
    expect(isListed({ visibility: "private", reviewStatus: "approved" })).toBe(false);
  });
});

describe("isAuthor", () => {
  it("matches the author's user id", () => {
    expect(isAuthor({ authorId: "author" }, author)).toBe(true);
  });

  it("does not match another user", () => {
    expect(isAuthor({ authorId: "author" }, other)).toBe(false);
  });

  it("never matches an anonymous viewer, even when the recipe has no author", () => {
    expect(isAuthor({ authorId: null }, anonymous)).toBe(false);
    expect(isAuthor({ authorId: "author" }, anonymous)).toBe(false);
  });

  it("does not make a signed in user the author of a house recipe", () => {
    expect(isAuthor({ authorId: null }, other)).toBe(false);
  });
});

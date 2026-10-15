import { describe, expect, it } from "vitest";
import { stripLocale } from "./language-switcher";

describe("stripLocale", () => {
  it("removes the Greek prefix", () => {
    expect(stripLocale("/el/recipes/x")).toBe("/recipes/x");
    expect(stripLocale("/el")).toBe("/");
  });

  it("removes the internal English prefix the proxy rewrites to", () => {
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/en/recipes/x")).toBe("/recipes/x");
  });

  it("leaves paths without a locale alone", () => {
    expect(stripLocale("/recipes/x")).toBe("/recipes/x");
    expect(stripLocale("/")).toBe("/");
  });
});

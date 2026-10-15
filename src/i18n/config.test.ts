import { describe, expect, it } from "vitest";
import { isLocale, localePath } from "./config";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("el")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale("en-US")).toBe(false);
  });
});

describe("localePath", () => {
  it("serves English without a prefix", () => {
    expect(localePath("en", "/recipes/x")).toBe("/recipes/x");
    expect(localePath("en", "/")).toBe("/");
  });

  it("defaults to the root path", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("el")).toBe("/el");
  });

  it("prefixes Greek", () => {
    expect(localePath("el", "/")).toBe("/el");
    expect(localePath("el", "/recipes/x")).toBe("/el/recipes/x");
  });

  it("adds the missing leading slash", () => {
    expect(localePath("el", "recipes/x")).toBe("/el/recipes/x");
    expect(localePath("en", "recipes/x")).toBe("/recipes/x");
  });
});

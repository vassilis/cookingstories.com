import { describe, expect, it } from "vitest";
import { parseUserRecipe, slugify, userRecipeSchema } from "./user-recipes";

describe("slugify", () => {
  it("lowercases and joins English words with dashes", () => {
    expect(slugify("Orange cake with orange glaze")).toBe("orange-cake-with-orange-glaze");
  });

  it("transliterates Greek and drops accents", () => {
    expect(slugify("Φακές με λεμόνι")).toBe("fakes-me-lemoni");
  });

  it("transliterates the digraph ου as ou", () => {
    expect(slugify("Χορτόσουπα")).toBe("chortosoupa");
  });

  it("handles the final sigma", () => {
    expect(slugify("Ρύζι ς")).toBe("ryzi-s");
    expect(slugify("Τυρόπιτες")).toBe("tyropites");
  });

  it("collapses punctuation and repeated spaces into single dashes", () => {
    expect(slugify("Mum's   pie,  (the   best)!")).toBe("mum-s-pie-the-best");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  --Hello world--  ")).toBe("hello-world");
  });

  it("cuts long titles to at most 60 characters", () => {
    const slug = slugify("a".repeat(100));
    expect(slug).toHaveLength(60);
  });

  it("leaves no trailing dash after cutting", () => {
    // The dash falls exactly at position 60 (index 59).
    const title = `${"a".repeat(59)} bbb`;
    const slug = slugify(title);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe("a".repeat(59));
  });

  it("returns 'recipe' for empty or symbols-only input", () => {
    expect(slugify("")).toBe("recipe");
    expect(slugify("   ")).toBe("recipe");
    expect(slugify("!!! ???")).toBe("recipe");
  });
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  title: "Orange cake",
  description: "Soft and sweet",
  story: "My grandmother made it every Sunday.",
  ingredients: "3 eggs\n200 g sugar",
  steps: "Mix everything.\nBake it.",
  category: "desserts",
  country: "GR",
  visibility: "private",
  locale: "en",
};

describe("parseUserRecipe", () => {
  it("parses valid input", () => {
    expect(parseUserRecipe(form(valid))).toEqual({ ...valid, needsOven: false });
  });

  it("sets needsOven only for the value 'on'", () => {
    expect(parseUserRecipe(form({ ...valid, needsOven: "on" })).needsOven).toBe(true);
    expect(parseUserRecipe(form({ ...valid, needsOven: "true" })).needsOven).toBe(false);
    expect(parseUserRecipe(form({ ...valid, needsOven: "" })).needsOven).toBe(false);
    expect(parseUserRecipe(form(valid)).needsOven).toBe(false);
  });

  it("trims text fields", () => {
    const parsed = parseUserRecipe(form({ ...valid, title: "  Orange cake  ", ingredients: "\n 3 eggs \n" }));
    expect(parsed.title).toBe("Orange cake");
    expect(parsed.ingredients).toBe("3 eggs");
  });

  it("trims and upper-cases the country", () => {
    expect(parseUserRecipe(form({ ...valid, country: " it " })).country).toBe("IT");
  });

  it("allows an empty country", () => {
    expect(parseUserRecipe(form({ ...valid, country: "" })).country).toBe("");
  });

  it("rejects a country that is not two letters", () => {
    expect(() => parseUserRecipe(form({ ...valid, country: "ITA" }))).toThrow();
    expect(() => parseUserRecipe(form({ ...valid, country: "I" }))).toThrow();
    expect(() => parseUserRecipe(form({ ...valid, country: "1T" }))).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() => parseUserRecipe(form({ ...valid, title: "" }))).toThrow();
    expect(() => parseUserRecipe(form({ ...valid, title: "   " }))).toThrow();
  });

  it("rejects empty ingredients", () => {
    expect(() => parseUserRecipe(form({ ...valid, ingredients: "  " }))).toThrow();
  });

  it("rejects empty steps", () => {
    expect(() => parseUserRecipe(form({ ...valid, steps: "" }))).toThrow();
  });

  it("rejects an unknown visibility", () => {
    expect(() => parseUserRecipe(form({ ...valid, visibility: "secret" }))).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => parseUserRecipe(form({ ...valid, category: "snacks" }))).toThrow();
  });

  it("rejects an unknown locale", () => {
    expect(() => parseUserRecipe(form({ ...valid, locale: "fr" }))).toThrow();
  });

  it("rejects a title longer than 200 characters", () => {
    expect(() => parseUserRecipe(form({ ...valid, title: "a".repeat(201) }))).toThrow();
  });

  it("accepts a title of exactly 200 characters", () => {
    expect(parseUserRecipe(form({ ...valid, title: "a".repeat(200) })).title).toHaveLength(200);
  });
});

describe("userRecipeSchema", () => {
  it("accepts every visibility option", () => {
    for (const visibility of ["private", "link", "public"]) {
      expect(userRecipeSchema.safeParse({ ...valid, visibility, needsOven: false }).success).toBe(true);
    }
  });

  it("requires needsOven to be a boolean", () => {
    expect(userRecipeSchema.safeParse({ ...valid, needsOven: "on" }).success).toBe(false);
  });
});

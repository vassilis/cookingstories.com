import { describe, expect, it } from "vitest";
import { parseRecipeEdit, recipeEditSchema } from "./recipe-edits";

const validFields: Record<string, string> = {
  slug: "kotosalata",
  locale: "en",
  title: "Chicken salad",
  description: "A simple salad.",
  ingredients: "chicken\n# Dressing\noil",
  steps: "Mix.\nServe.",
  category: "mains",
  country: "GR",
  visibility: "public",
  reviewStatus: "approved",
};

function form(overrides: Record<string, string | null> = {}): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...validFields, ...overrides })) {
    if (value !== null) fd.set(key, value);
  }
  return fd;
}

describe("parseRecipeEdit", () => {
  it("parses a valid form", () => {
    expect(parseRecipeEdit(form())).toEqual({
      slug: "kotosalata",
      locale: "en",
      title: "Chicken salad",
      description: "A simple salad.",
      ingredients: "chicken\n# Dressing\noil",
      steps: "Mix.\nServe.",
      category: "mains",
      country: "GR",
      needsOven: false,
      visibility: "public",
      reviewStatus: "approved",
    });
  });

  it("sets needsOven only when the checkbox value is 'on'", () => {
    expect(parseRecipeEdit(form({ needsOven: "on" })).needsOven).toBe(true);
    expect(parseRecipeEdit(form()).needsOven).toBe(false);
    expect(parseRecipeEdit(form({ needsOven: "true" })).needsOven).toBe(false);
    expect(parseRecipeEdit(form({ needsOven: "" })).needsOven).toBe(false);
  });

  it("trims and upper-cases the country", () => {
    expect(parseRecipeEdit(form({ country: "it" })).country).toBe("IT");
    expect(parseRecipeEdit(form({ country: "  gr " })).country).toBe("GR");
  });

  it("allows an empty country", () => {
    expect(parseRecipeEdit(form({ country: "" })).country).toBe("");
    expect(parseRecipeEdit(form({ country: "   " })).country).toBe("");
  });

  it("rejects country codes that are not two letters", () => {
    expect(() => parseRecipeEdit(form({ country: "ITA" }))).toThrow();
    expect(() => parseRecipeEdit(form({ country: "1A" }))).toThrow();
    expect(() => parseRecipeEdit(form({ country: "I" }))).toThrow();
  });

  it("trims the title and description", () => {
    const edit = parseRecipeEdit(form({ title: "  Soup  ", description: "  Warm.  " }));
    expect(edit.title).toBe("Soup");
    expect(edit.description).toBe("Warm.");
  });

  it("rejects an empty or blank title", () => {
    expect(() => parseRecipeEdit(form({ title: "" }))).toThrow();
    expect(() => parseRecipeEdit(form({ title: "   " }))).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => parseRecipeEdit(form({ category: "snacks" }))).toThrow();
  });

  it("rejects an unknown visibility", () => {
    expect(() => parseRecipeEdit(form({ visibility: "secret" }))).toThrow();
  });

  it("rejects an unknown locale", () => {
    expect(() => parseRecipeEdit(form({ locale: "fr" }))).toThrow();
  });

  it("rejects an unknown review status", () => {
    expect(() => parseRecipeEdit(form({ reviewStatus: "maybe" }))).toThrow();
  });

  it("rejects a missing slug", () => {
    expect(() => parseRecipeEdit(form({ slug: null }))).toThrow();
  });
});

describe("recipeEditSchema", () => {
  const valid = {
    slug: "x",
    locale: "el",
    title: "T",
    description: "",
    ingredients: "",
    steps: "",
    category: "pasta",
    country: "",
    needsOven: true,
    visibility: "private",
    reviewStatus: "pending",
  };

  it("accepts a valid object", () => {
    expect(recipeEditSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts every visibility", () => {
    for (const visibility of ["private", "link", "public"]) {
      expect(recipeEditSchema.safeParse({ ...valid, visibility }).success).toBe(true);
    }
  });

  it("requires needsOven to be a boolean", () => {
    expect(recipeEditSchema.safeParse({ ...valid, needsOven: "on" }).success).toBe(false);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { queryPublicRecipe, queryPublicSummaries, queryRecipeIndex } from "@/lib/recipe-queries";
import { insertRecipe, resetDb, testDb } from "./helpers";

/*
 * The privacy rule for public pages: only recipes that are public AND approved may appear,
 * in listings or by direct URL. Anything private, link-only, pending or rejected stays out.
 */

const { db, close } = testDb();
afterAll(close);
beforeEach(() => resetDb(db));

async function seedVisibilityMix() {
  await insertRecipe(db, { slug: "listed", titles: { el: "Δημόσια", en: "Listed" } });
  await insertRecipe(db, { slug: "private", visibility: "private", titles: { el: "Ιδιωτική" } });
  await insertRecipe(db, { slug: "link-only", visibility: "link", titles: { el: "Με σύνδεσμο" } });
  await insertRecipe(db, { slug: "pending", reviewStatus: "pending", titles: { el: "Σε αναμονή" } });
  await insertRecipe(db, { slug: "rejected", reviewStatus: "rejected", titles: { el: "Απορρίφθηκε" } });
  await insertRecipe(db, {
    slug: "private-but-approved",
    visibility: "private",
    reviewStatus: "approved",
    titles: { el: "Ιδιωτική εγκεκριμένη" },
  });
}

describe("public listings", () => {
  it("contain only public, approved recipes", async () => {
    await seedVisibilityMix();
    const slugs = (await queryPublicSummaries(db, "en")).map((r) => r.slug);
    expect(slugs).toEqual(["listed"]);
  });

  it("count only listed recipes in the index", async () => {
    await seedVisibilityMix();
    const index = await queryRecipeIndex(db, "en");
    expect(index.total).toBe(1);
    expect(index.byCategory.flatMap((g) => g.recipes.map((r) => r.slug))).toEqual(["listed"]);
  });

  it("leave hidden recipes out of country counts", async () => {
    await insertRecipe(db, { slug: "gr-public", country: "GR", titles: { el: "Α" } });
    await insertRecipe(db, { slug: "gr-private", country: "GR", visibility: "private", titles: { el: "Β" } });
    const index = await queryRecipeIndex(db, "en");
    expect(index.byCountry).toEqual([{ country: "GR", count: 1, examples: ["Α"] }]);
  });
});

describe("opening a recipe by URL", () => {
  it.each(["private", "link-only", "pending", "rejected", "private-but-approved"])(
    "does not reveal %s recipes",
    async (slug) => {
      await seedVisibilityMix();
      expect(await queryPublicRecipe(db, slug, "en")).toBeNull();
    },
  );

  it("returns a listed recipe", async () => {
    await seedVisibilityMix();
    const recipe = await queryPublicRecipe(db, "listed", "en");
    expect(recipe?.title).toBe("Listed");
  });

  it("returns null for a slug that doesn't exist", async () => {
    expect(await queryPublicRecipe(db, "nope", "en")).toBeNull();
  });

  it("never links to a hidden recipe as previous or next", async () => {
    await insertRecipe(db, { slug: "a", titles: { en: "A" }, originalLocale: "en" });
    await insertRecipe(db, { slug: "b", visibility: "private", titles: { en: "B" }, originalLocale: "en" });
    await insertRecipe(db, { slug: "c", titles: { en: "C" }, originalLocale: "en" });
    const recipe = await queryPublicRecipe(db, "a", "en");
    expect(recipe?.next?.slug).toBe("c");
  });
});

describe("language fallback", () => {
  it("shows the requested language when it exists", async () => {
    await insertRecipe(db, { slug: "x", titles: { el: "Κέικ", en: "Cake" }, machineTranslated: ["en"] });
    const recipe = await queryPublicRecipe(db, "x", "en");
    expect(recipe).toMatchObject({ title: "Cake", contentLocale: "en", translated: true });
  });

  it("falls back to the original language", async () => {
    await insertRecipe(db, { slug: "x", titles: { el: "Κέικ" } });
    const recipe = await queryPublicRecipe(db, "x", "en");
    expect(recipe).toMatchObject({ title: "Κέικ", contentLocale: "el", translated: false });
  });

  it("does not call a translation written by a person 'translated'", async () => {
    await insertRecipe(db, { slug: "x", titles: { el: "Κέικ", en: "Cake" } });
    expect((await queryPublicRecipe(db, "x", "en"))?.translated).toBe(false);
  });
});

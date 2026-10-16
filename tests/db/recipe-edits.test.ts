import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { recipes, recipeTranslations } from "@/db/schema";
import { applyRecipeEdit, type RecipeEdit } from "@/lib/recipe-edits";
import { queryPublicRecipe } from "@/lib/recipe-queries";
import { insertRecipe, resetDb, testDb } from "./helpers";

const { db, close } = testDb();
afterAll(close);
beforeEach(() => resetDb(db));

const edit = (overrides: Partial<RecipeEdit> = {}): RecipeEdit => ({
  slug: "cake",
  locale: "en",
  title: "Orange cake",
  description: "",
  ingredients: "3 eggs\n# For the glaze\n1 cup icing sugar",
  steps: "Mix.\nBake for 50 minutes.",
  category: "desserts",
  country: "GR",
  needsOven: true,
  visibility: "public",
  reviewStatus: "approved",
  ...overrides,
});

async function translation(locale: string) {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.slug, "cake"));
  const [row] = await db
    .select()
    .from(recipeTranslations)
    .where(and(eq(recipeTranslations.recipeId, recipe.id), eq(recipeTranslations.locale, locale)));
  return { recipe, row };
}

describe("saving an edit", () => {
  it("replaces the text for that language and marks it as checked by a person", async () => {
    await insertRecipe(db, { slug: "cake", titles: { el: "Κέικ", en: "Cake" }, machineTranslated: ["en"] });
    await applyRecipeEdit(db, edit());

    const { row } = await translation("en");
    expect(row).toMatchObject({
      title: "Orange cake",
      description: null,
      machineTranslated: false,
      ingredients: [
        { title: null, items: ["3 eggs"] },
        { title: "For the glaze", items: ["1 cup icing sugar"] },
      ],
      steps: ["Mix.", "Bake for 50 minutes."],
    });
  });

  it("leaves the other language untouched", async () => {
    await insertRecipe(db, { slug: "cake", titles: { el: "Κέικ", en: "Cake" } });
    await applyRecipeEdit(db, edit());
    expect((await translation("el")).row.title).toBe("Κέικ");
  });

  it("adds the language if the recipe didn't have it yet", async () => {
    await insertRecipe(db, { slug: "cake", titles: { el: "Κέικ" } });
    await applyRecipeEdit(db, edit());
    expect((await translation("en")).row.title).toBe("Orange cake");
  });

  it("updates the details shared by every language", async () => {
    await insertRecipe(db, { slug: "cake", titles: { el: "Κέικ" } });
    await applyRecipeEdit(db, edit({ category: "pies", country: "IT", needsOven: false }));
    expect((await translation("el")).recipe).toMatchObject({ category: "pies", country: "IT", needsOven: false });
  });

  it("stores an empty country as unknown", async () => {
    await insertRecipe(db, { slug: "cake", country: "GR", titles: { el: "Κέικ" } });
    await applyRecipeEdit(db, edit({ country: "" }));
    expect((await translation("el")).recipe.country).toBeNull();
  });

  it("takes a recipe off the public site when made private", async () => {
    await insertRecipe(db, { slug: "cake", titles: { el: "Κέικ" } });
    await applyRecipeEdit(db, edit({ visibility: "private" }));
    expect(await queryPublicRecipe(db, "cake", "en")).toBeNull();
  });

  it("fails for an unknown recipe without writing anything", async () => {
    await expect(applyRecipeEdit(db, edit({ slug: "missing" }))).rejects.toThrow("not found");
    expect(await db.select().from(recipeTranslations)).toHaveLength(0);
  });
});

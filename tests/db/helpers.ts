import { sql } from "drizzle-orm";
import { createDb, type Database } from "@/db/client";
import { recipes, recipeTranslations } from "@/db/schema";
import type { Category, IngredientGroup } from "@/db/seed-types";

export function testDb(): { db: Database; close: () => Promise<void> } {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  return createDb(url, { max: 2 });
}

/** Empties every table so each test starts from nothing. */
export async function resetDb(db: Database) {
  await db.execute(sql`truncate table recipe_translations, recipes, session, account, verification, "user" cascade`);
}

type RecipeFixture = {
  slug: string;
  category?: Category;
  country?: string | null;
  needsOven?: boolean;
  originalLocale?: string;
  visibility?: "private" | "link" | "public";
  reviewStatus?: "pending" | "approved" | "rejected";
  /** locale -> title; ingredients and steps get simple defaults. */
  titles: Record<string, string>;
  machineTranslated?: string[];
};

export async function insertRecipe(db: Database, f: RecipeFixture) {
  const [row] = await db
    .insert(recipes)
    .values({
      slug: f.slug,
      category: f.category ?? "desserts",
      country: f.country ?? null,
      needsOven: f.needsOven ?? false,
      originalLocale: f.originalLocale ?? "el",
      visibility: f.visibility ?? "public",
      reviewStatus: f.reviewStatus ?? "approved",
    })
    .returning({ id: recipes.id });
  const ingredients: IngredientGroup[] = [{ title: null, items: ["1 egg", "100 g flour"] }];
  for (const [locale, title] of Object.entries(f.titles)) {
    await db.insert(recipeTranslations).values({
      recipeId: row.id,
      locale,
      title,
      description: null,
      ingredients,
      steps: ["Mix.", "Bake."],
      machineTranslated: f.machineTranslated?.includes(locale) ?? false,
    });
  }
  return row.id;
}

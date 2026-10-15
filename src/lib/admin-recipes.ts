import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeTranslations, type Recipe, type RecipeTranslation } from "@/db/schema";
import { CATEGORIES } from "@/db/seed-types";
import type { Locale } from "@/i18n/config";

/*
 * Admin reads. Never cached: an editor must see what is in the database right now.
 * Callers must have passed requireAdmin().
 */

export type AdminRecipeRow = Pick<Recipe, "slug" | "category" | "country" | "visibility" | "reviewStatus" | "originalLocale"> & {
  title: string;
  locales: { locale: string; machineTranslated: boolean }[];
};

export async function listRecipesForAdmin(locale: Locale): Promise<AdminRecipeRow[]> {
  const rows = await db().select().from(recipes);
  const translations = await db()
    .select({
      recipeId: recipeTranslations.recipeId,
      locale: recipeTranslations.locale,
      title: recipeTranslations.title,
      machineTranslated: recipeTranslations.machineTranslated,
    })
    .from(recipeTranslations);

  return rows
    .map((r) => {
      const own = translations.filter((t) => t.recipeId === r.id);
      const shown = own.find((t) => t.locale === locale) ?? own.find((t) => t.locale === r.originalLocale);
      return {
        slug: r.slug,
        category: r.category,
        country: r.country,
        visibility: r.visibility,
        reviewStatus: r.reviewStatus,
        originalLocale: r.originalLocale,
        title: shown?.title ?? r.slug,
        locales: own.map((t) => ({ locale: t.locale, machineTranslated: t.machineTranslated })),
      };
    })
    .sort(
      (a, b) =>
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.title.localeCompare(b.title, locale),
    );
}

export async function getRecipeForEdit(
  slug: string,
): Promise<{ recipe: Recipe; translations: RecipeTranslation[] } | null> {
  const [recipe] = await db().select().from(recipes).where(eq(recipes.slug, slug));
  if (!recipe) return null;
  const translations = await db().select().from(recipeTranslations).where(eq(recipeTranslations.recipeId, recipe.id));
  return { recipe, translations };
}

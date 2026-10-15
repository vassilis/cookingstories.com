import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { recipes, recipeTranslations, type Recipe, type RecipeTranslation } from "@/db/schema";
import { CATEGORIES, type Category } from "@/db/seed-types";

/*
 * The queries behind the public pages. They take the database as an argument and use no
 * Next.js APIs, so the visibility rules can be tested against a real Postgres.
 * src/lib/recipes.ts wraps them with caching for the app.
 *
 * Visibility rule: only recipes that are public AND approved are ever returned here.
 */

export type RecipeSummary = {
  slug: string;
  category: Category;
  country: string | null;
  title: string;
  description: string | null;
  ingredientCount: number;
  stepCount: number;
  needsOven: boolean;
};

export type RecipeDetail = RecipeSummary & {
  /** Locale of the text actually shown (may differ from the page locale if no translation exists). */
  contentLocale: string;
  originalLocale: string;
  /** True when the shown text is a machine translation of the original. */
  translated: boolean;
  ingredients: RecipeTranslation["ingredients"];
  steps: string[];
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export type RecipeIndex = {
  byCategory: { category: Category; recipes: RecipeSummary[] }[];
  byCountry: { country: string; count: number; examples: string[] }[];
  total: number;
};

const isListed = and(eq(recipes.visibility, "public"), eq(recipes.reviewStatus, "approved"));

export async function queryRecipeIndex(db: Database, locale: string): Promise<RecipeIndex> {
  const all = await queryPublicSummaries(db, locale);
  const byCategory = CATEGORIES.map((category) => ({
    category,
    recipes: all.filter((r) => r.category === category),
  })).filter((g) => g.recipes.length > 0);

  const countries = new Map<string, RecipeSummary[]>();
  for (const r of all) {
    if (!r.country) continue;
    countries.set(r.country, [...(countries.get(r.country) ?? []), r]);
  }
  const byCountry = [...countries.entries()]
    .map(([country, list]) => ({
      country,
      count: list.length,
      examples: list.slice(0, 3).map((r) => r.title),
    }))
    .sort((a, b) => b.count - a.count);

  return { byCategory, byCountry, total: all.length };
}

export async function queryPublicRecipe(db: Database, slug: string, locale: string): Promise<RecipeDetail | null> {
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), isListed));
  if (!recipe) return null;

  const translations = await db.select().from(recipeTranslations).where(eq(recipeTranslations.recipeId, recipe.id));
  const text = pickTranslation(recipe, translations, locale);
  if (!text) return null;

  // Previous/next follow the same order as the contents list.
  const siblings = (await queryPublicSummaries(db, locale)).filter((r) => r.category === recipe.category);
  const i = siblings.findIndex((r) => r.slug === slug);
  const link = (r?: RecipeSummary) => (r ? { slug: r.slug, title: r.title } : null);

  return {
    ...summarize(recipe, text),
    contentLocale: text.locale,
    originalLocale: recipe.originalLocale,
    translated: text.locale !== recipe.originalLocale && text.machineTranslated,
    ingredients: text.ingredients,
    steps: text.steps,
    previous: link(siblings[i - 1]),
    next: link(siblings[i + 1]),
  };
}

export async function queryPublicSummaries(db: Database, locale: string): Promise<RecipeSummary[]> {
  const rows = await db.select().from(recipes).where(isListed);
  if (rows.length === 0) return [];

  const translations = await db
    .select()
    .from(recipeTranslations)
    .where(inArray(recipeTranslations.recipeId, rows.map((r) => r.id)));

  return rows
    .map((recipe) => {
      const text = pickTranslation(
        recipe,
        translations.filter((t) => t.recipeId === recipe.id),
        locale,
      );
      return text ? summarize(recipe, text) : null;
    })
    .filter((r): r is RecipeSummary => r !== null)
    .sort((a, b) => a.title.localeCompare(b.title, locale));
}

/** The requested locale if we have it, otherwise the author's original. */
function pickTranslation(recipe: Recipe, translations: RecipeTranslation[], locale: string) {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === recipe.originalLocale) ??
    null
  );
}

function summarize(recipe: Recipe, text: RecipeTranslation): RecipeSummary {
  return {
    slug: recipe.slug,
    category: recipe.category,
    country: recipe.country,
    title: text.title,
    description: text.description,
    ingredientCount: text.ingredients.reduce((n, g) => n + g.items.length, 0),
    stepCount: text.steps.length,
    needsOven: recipe.needsOven,
  };
}

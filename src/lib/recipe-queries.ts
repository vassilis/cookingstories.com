import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { recipes, recipeTranslations, type Recipe, type RecipeTranslation } from "@/db/schema";
import { CATEGORIES, type Category } from "@/db/seed-types";
import { canView, isListed, type Viewer } from "./recipe-access";

/*
 * The queries behind the recipe pages. They take the database as an argument and use no
 * Next.js APIs, so the visibility rules can be tested against a real Postgres.
 * src/lib/recipes.ts wraps them with caching for the app.
 *
 * Listings only ever contain public, approved recipes. Opening a single recipe also goes
 * through canView() in recipe-access.ts, so authors, admins and share links get access too.
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
  id: string;
  authorId: string | null;
  visibility: Recipe["visibility"];
  reviewStatus: Recipe["reviewStatus"];
  /** Only meaningful to the author; never render it for anyone else. */
  shareToken: string | null;
  /** Locale of the text actually shown (may differ from the page locale if no translation exists). */
  contentLocale: string;
  originalLocale: string;
  /** True when the shown text is a machine translation of the original. */
  translated: boolean;
  story: string | null;
  ingredients: RecipeTranslation["ingredients"];
  steps: string[];
  /** Neighbours in the contents list; only set for listed recipes. */
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export type RecipeIndex = {
  byCategory: { category: Category; recipes: RecipeSummary[] }[];
  byCountry: { country: string; count: number; examples: string[] }[];
  total: number;
};

const listedCondition = and(eq(recipes.visibility, "public"), eq(recipes.reviewStatus, "approved"));

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

/** A listed recipe, for anyone. Safe to cache: the answer is the same for every visitor. */
export async function queryPublicRecipe(db: Database, slug: string, locale: string): Promise<RecipeDetail | null> {
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), listedCondition));
  return recipe ? buildDetail(db, recipe, locale) : null;
}

/** Any recipe this viewer may open: their own, a shared link, or (for admins) anything. Never cache. */
export async function queryRecipeForViewer(
  db: Database,
  slug: string,
  locale: string,
  viewer: Viewer,
): Promise<RecipeDetail | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.slug, slug));
  if (!recipe || !canView(recipe, viewer)) return null;
  return buildDetail(db, recipe, locale);
}

export async function queryPublicSummaries(db: Database, locale: string): Promise<RecipeSummary[]> {
  const rows = await db.select().from(recipes).where(listedCondition);
  return summariesFor(db, rows, locale);
}

/** Summaries for given recipes, in the requested language where it exists. */
export async function summariesFor(db: Database, rows: Recipe[], locale: string): Promise<RecipeSummary[]> {
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

async function buildDetail(db: Database, recipe: Recipe, locale: string): Promise<RecipeDetail | null> {
  const translations = await db.select().from(recipeTranslations).where(eq(recipeTranslations.recipeId, recipe.id));
  const text = pickTranslation(recipe, translations, locale);
  if (!text) return null;

  // Previous/next follow the same order as the contents list, so only listed recipes get them.
  let previous: RecipeDetail["previous"] = null;
  let next: RecipeDetail["next"] = null;
  if (isListed(recipe)) {
    const siblings = (await queryPublicSummaries(db, locale)).filter((r) => r.category === recipe.category);
    const i = siblings.findIndex((r) => r.slug === recipe.slug);
    const link = (r?: RecipeSummary) => (r ? { slug: r.slug, title: r.title } : null);
    previous = link(siblings[i - 1]);
    next = link(siblings[i + 1]);
  }

  return {
    ...summarize(recipe, text),
    id: recipe.id,
    authorId: recipe.authorId,
    visibility: recipe.visibility,
    reviewStatus: recipe.reviewStatus,
    shareToken: recipe.shareToken,
    contentLocale: text.locale,
    originalLocale: recipe.originalLocale,
    translated: text.locale !== recipe.originalLocale && text.machineTranslated,
    story: text.story,
    ingredients: text.ingredients,
    steps: text.steps,
    previous,
    next,
  };
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

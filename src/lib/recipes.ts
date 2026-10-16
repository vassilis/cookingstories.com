import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "@/db";
import type { Locale } from "@/i18n/config";
import { currentViewer } from "./session";
import {
  queryPublicRecipe,
  queryRecipeForViewer,
  queryRecipeIndex,
  type RecipeDetail,
  type RecipeIndex,
  type RecipeSummary,
} from "./recipe-queries";

export type { RecipeDetail, RecipeIndex, RecipeSummary };

/*
 * Cached data access for the public pages. The queries (and the visibility rules) live in
 * recipe-queries.ts.
 *
 * Every exported function calls connection() first, so pages never query Postgres while
 * `next build` prerenders (the database isn't reachable from the Docker build). Results are
 * then cached in memory and invalidated with the "recipes" tag when content changes.
 */

export async function getRecipeIndex(locale: Locale): Promise<RecipeIndex> {
  await connection();
  return cachedIndex(locale);
}

/** Changes once a day (UTC) and is the same for every visitor. */
export async function getRecipeOfTheDay(locale: Locale): Promise<RecipeSummary | null> {
  const { byCategory } = await getRecipeIndex(locale);
  const all = byCategory.flatMap((g) => g.recipes);
  if (all.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return all[day % all.length];
}

export async function getPublicRecipe(slug: string, locale: Locale): Promise<RecipeDetail | null> {
  await connection();
  return cachedRecipe(slug, locale);
}

/**
 * A recipe page's data: the cached public version when there is one, otherwise whatever this
 * visitor may see (their own recipe, a share link, or anything for admins), uncached.
 */
export async function getRecipeForPage(
  slug: string,
  locale: Locale,
  shareToken: string | null,
): Promise<RecipeDetail | null> {
  const listed = await getPublicRecipe(slug, locale);
  if (listed) return listed;
  return queryRecipeForViewer(db(), slug, locale, await currentViewer(shareToken));
}

async function cachedIndex(locale: Locale): Promise<RecipeIndex> {
  "use cache";
  cacheTag("recipes");
  cacheLife("hours");
  return queryRecipeIndex(db(), locale);
}

async function cachedRecipe(slug: string, locale: Locale): Promise<RecipeDetail | null> {
  "use cache";
  cacheTag("recipes", `recipe:${slug}`);
  cacheLife("hours");
  return queryPublicRecipe(db(), slug, locale);
}

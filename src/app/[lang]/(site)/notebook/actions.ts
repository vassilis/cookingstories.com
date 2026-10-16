"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { requireUser } from "@/lib/session";
import { createUserRecipe, deleteUserRecipe, parseUserRecipe, updateUserRecipe, type UserRecipeInput } from "@/lib/user-recipes";

const uiLocaleOf = (formData: FormData): Locale => {
  const value = String(formData.get("uiLocale") ?? "");
  return isLocale(value) ? value : "en";
};

/** Creates a recipe (no slug in the form) or updates the author's own one. */
export async function saveRecipeAction(formData: FormData) {
  const uiLocale = uiLocaleOf(formData);
  const slug = String(formData.get("slug") ?? "") || null;
  const back = localePath(uiLocale, slug ? `/notebook/recipes/${slug}/edit` : "/notebook/new");
  // Check the session here too: a server action can be called without the page.
  const user = await requireUser(uiLocale, back);
  const viewer = { userId: user.id, isAdmin: user.isAdmin };

  let input: UserRecipeInput;
  try {
    input = parseUserRecipe(formData);
  } catch {
    redirect(`${back}?error=invalid`);
  }

  const recipe = slug ? await updateUserRecipe(db(), viewer, slug, input) : await createUserRecipe(db(), viewer, input);
  updateTag("recipes");
  updateTag(`recipe:${recipe.slug}`);
  redirect(`${localePath(uiLocale, `/notebook/recipes/${recipe.slug}/edit`)}?saved=1`);
}

export async function deleteRecipeAction(formData: FormData) {
  const uiLocale = uiLocaleOf(formData);
  const slug = String(formData.get("slug") ?? "");
  const user = await requireUser(uiLocale, localePath(uiLocale, "/notebook"));
  await deleteUserRecipe(db(), { userId: user.id, isAdmin: user.isAdmin }, slug);
  updateTag("recipes");
  updateTag(`recipe:${slug}`);
  redirect(localePath(uiLocale, "/notebook"));
}

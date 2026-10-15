"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { isLocale, localePath } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { applyRecipeEdit, parseRecipeEdit } from "@/lib/recipe-edits";

/** Saves one language version of a recipe plus its shared details. Admins only. */
export async function saveRecipe(formData: FormData) {
  const uiLocale = String(formData.get("uiLocale") ?? "");
  const locale = isLocale(uiLocale) ? uiLocale : "en";
  // Authorize inside the action itself; never trust that the form came from the admin page.
  await requireAdmin(locale);

  const edit = parseRecipeEdit(formData);
  await applyRecipeEdit(db(), edit);

  updateTag("recipes");
  updateTag(`recipe:${edit.slug}`);

  redirect(`${localePath(locale, `/admin/recipes/${edit.slug}`)}?locale=${edit.locale}&saved=1`);
}

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { recipes, recipeTranslations } from "@/db/schema";
import { CATEGORIES } from "@/db/seed-types";
import { locales } from "@/i18n/config";
import { textToIngredients, textToSteps } from "./recipe-text";

/*
 * Saving an edit from the admin editor. No Next.js APIs here, so it can be tested against a
 * real database; the server action in app/[lang]/admin/actions.ts adds the auth check and
 * cache refresh around it.
 */

export const recipeEditSchema = z.object({
  slug: z.string().min(1),
  locale: z.enum(locales),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  ingredients: z.string(),
  steps: z.string(),
  category: z.enum(CATEGORIES),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a two-letter country code"),
  needsOven: z.boolean(),
  visibility: z.enum(["private", "link", "public"]),
  reviewStatus: z.enum(["pending", "approved", "rejected"]),
});

export type RecipeEdit = z.infer<typeof recipeEditSchema>;

/** Reads the editor's form fields. The oven checkbox is only present when ticked. */
export function parseRecipeEdit(formData: FormData): RecipeEdit {
  return recipeEditSchema.parse({
    ...Object.fromEntries(formData),
    needsOven: formData.get("needsOven") === "on",
  });
}

/**
 * Updates the recipe's shared details and replaces (or adds) the text for one language.
 * The edited text is marked as written by a person, not machine translated.
 */
export async function applyRecipeEdit(db: Database, edit: RecipeEdit): Promise<void> {
  await db.transaction(async (tx) => {
    const [recipe] = await tx
      .update(recipes)
      .set({
        category: edit.category,
        country: edit.country || null,
        needsOven: edit.needsOven,
        visibility: edit.visibility,
        reviewStatus: edit.reviewStatus,
      })
      .where(eq(recipes.slug, edit.slug))
      .returning({ id: recipes.id });
    if (!recipe) throw new Error(`Recipe ${edit.slug} not found`);

    const values = {
      title: edit.title,
      description: edit.description || null,
      ingredients: textToIngredients(edit.ingredients),
      steps: textToSteps(edit.steps),
      machineTranslated: false,
    };
    const updated = await tx
      .update(recipeTranslations)
      .set(values)
      .where(and(eq(recipeTranslations.recipeId, recipe.id), eq(recipeTranslations.locale, edit.locale)))
      .returning({ locale: recipeTranslations.locale });
    if (updated.length === 0) {
      await tx.insert(recipeTranslations).values({ recipeId: recipe.id, locale: edit.locale, ...values });
    }
  });
}

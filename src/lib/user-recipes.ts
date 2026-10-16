import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { recipes, recipeTranslations, type Recipe, type RecipeTranslation } from "@/db/schema";
import { CATEGORIES } from "@/db/seed-types";
import { locales } from "@/i18n/config";
import { canEdit, type Viewer } from "./recipe-access";
import { textToIngredients, textToSteps } from "./recipe-text";

/*
 * Recipes written by readers in their notebook. No Next.js APIs here; the server actions in
 * app/[lang]/(site)/notebook/actions.ts add the session check and cache refresh.
 *
 * Review rule: a reader's public recipe is listed only after an admin approves it, and any
 * later edit by the reader sends it back to review. Admin edits keep their status.
 */

export const userRecipeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500),
  story: z.string().trim().max(5000),
  ingredients: z.string().trim().min(1),
  steps: z.string().trim().min(1),
  category: z.enum(CATEGORIES),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a two-letter country code"),
  needsOven: z.boolean(),
  visibility: z.enum(["private", "link", "public"]),
  /** The language the author writes in. */
  locale: z.enum(locales),
});

export type UserRecipeInput = z.infer<typeof userRecipeSchema>;

export function parseUserRecipe(formData: FormData): UserRecipeInput {
  return userRecipeSchema.parse({
    ...Object.fromEntries(formData),
    needsOven: formData.get("needsOven") === "on",
  });
}

const GREEK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m",
  ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

/** "Φακές με λεμόνι" -> "fakes-me-lemoni". Greek is transliterated so URLs stay readable. */
export function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ου/g, "ou")
    .replace(/[α-ως]/g, (c) => GREEK[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "recipe";
}

const newShareToken = () => randomBytes(18).toString("base64url");

async function uniqueSlug(db: Database, title: string): Promise<string> {
  const base = slugify(title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
    const [taken] = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, slug));
    if (!taken) return slug;
  }
  throw new Error("Could not find a free slug");
}

function translationValues(input: UserRecipeInput) {
  return {
    title: input.title,
    description: input.description || null,
    story: input.story || null,
    ingredients: textToIngredients(input.ingredients),
    steps: textToSteps(input.steps),
    machineTranslated: false,
  };
}

export async function createUserRecipe(db: Database, viewer: Viewer, input: UserRecipeInput): Promise<Recipe> {
  if (!viewer.userId) throw new Error("Sign in to write a recipe");
  const slug = await uniqueSlug(db, input.title);
  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({
        slug,
        authorId: viewer.userId,
        category: input.category,
        country: input.country || null,
        needsOven: input.needsOven,
        originalLocale: input.locale,
        visibility: input.visibility,
        reviewStatus: viewer.isAdmin ? "approved" : "pending",
        shareToken: input.visibility === "link" ? newShareToken() : null,
        publishedAt: input.visibility === "public" && viewer.isAdmin ? new Date() : null,
      })
      .returning();
    await tx.insert(recipeTranslations).values({ recipeId: recipe.id, locale: input.locale, ...translationValues(input) });
    return recipe;
  });
}

export async function updateUserRecipe(
  db: Database,
  viewer: Viewer,
  slug: string,
  input: UserRecipeInput,
): Promise<Recipe> {
  const [current] = await db.select().from(recipes).where(eq(recipes.slug, slug));
  if (!current || !canEdit(current, viewer)) throw new Error("Not allowed to edit this recipe");

  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .update(recipes)
      .set({
        category: input.category,
        country: input.country || null,
        needsOven: input.needsOven,
        visibility: input.visibility,
        reviewStatus: viewer.isAdmin ? current.reviewStatus : "pending",
        // Keep an existing link working; create one the first time it's needed.
        shareToken: input.visibility === "link" ? (current.shareToken ?? newShareToken()) : current.shareToken,
      })
      .where(eq(recipes.id, current.id))
      .returning();

    const values = translationValues(input);
    const updated = await tx
      .update(recipeTranslations)
      .set(values)
      .where(and(eq(recipeTranslations.recipeId, current.id), eq(recipeTranslations.locale, input.locale)))
      .returning({ locale: recipeTranslations.locale });
    if (updated.length === 0) {
      await tx.insert(recipeTranslations).values({ recipeId: current.id, locale: input.locale, ...values });
    }
    return recipe;
  });
}

export async function deleteUserRecipe(db: Database, viewer: Viewer, slug: string): Promise<void> {
  const [current] = await db.select().from(recipes).where(eq(recipes.slug, slug));
  // Only the author deletes their own; the house collection (no author) can't be deleted here.
  if (!current || !current.authorId || !canEdit(current, viewer)) throw new Error("Not allowed to delete this recipe");
  await db.delete(recipes).where(eq(recipes.id, current.id));
}

export type EditableRecipe = { recipe: Recipe; text: RecipeTranslation | null };

/** A recipe and its text in the author's own language, if this viewer may edit it. */
export async function loadForEdit(db: Database, viewer: Viewer, slug: string): Promise<EditableRecipe | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.slug, slug));
  if (!recipe || !canEdit(recipe, viewer)) return null;
  const [text] = await db
    .select()
    .from(recipeTranslations)
    .where(and(eq(recipeTranslations.recipeId, recipe.id), eq(recipeTranslations.locale, recipe.originalLocale)));
  return { recipe, text: text ?? null };
}

import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { favorites, recipeNotes, recipes, type Recipe } from "@/db/schema";
import { canView, type Viewer } from "./recipe-access";
import { summariesFor, type RecipeSummary } from "./recipe-queries";

/*
 * A reader's notebook: their own recipes, favourites and private notes. Every function is
 * scoped to one user id; callers pass the signed-in user's id, never one from the request.
 */

export type MyRecipe = RecipeSummary & Pick<Recipe, "visibility" | "reviewStatus">;

export async function listMyRecipes(db: Database, userId: string, locale: string): Promise<MyRecipe[]> {
  const rows = await db.select().from(recipes).where(eq(recipes.authorId, userId)).orderBy(desc(recipes.updatedAt));
  const summaries = await summariesFor(db, rows, locale);
  return rows
    .map((r) => {
      const s = summaries.find((x) => x.slug === r.slug);
      return s ? { ...s, visibility: r.visibility, reviewStatus: r.reviewStatus } : null;
    })
    .filter((r): r is MyRecipe => r !== null);
}

/** Favourites the user can still open (a recipe made private by its author drops out). */
export async function listFavorites(db: Database, viewer: Viewer, locale: string): Promise<RecipeSummary[]> {
  if (!viewer.userId) return [];
  const rows = await db
    .select({ recipe: recipes })
    .from(favorites)
    .innerJoin(recipes, eq(favorites.recipeId, recipes.id))
    .where(eq(favorites.userId, viewer.userId))
    .orderBy(desc(favorites.createdAt));
  const visible = rows.map((r) => r.recipe).filter((r) => canView(r, viewer));
  return summariesFor(db, visible, locale);
}

export type NoteEntry = { recipe: RecipeSummary; body: string; updatedAt: Date };

export async function listNotes(db: Database, viewer: Viewer, locale: string): Promise<NoteEntry[]> {
  if (!viewer.userId) return [];
  const rows = await db
    .select({ recipe: recipes, body: recipeNotes.body, updatedAt: recipeNotes.updatedAt })
    .from(recipeNotes)
    .innerJoin(recipes, eq(recipeNotes.recipeId, recipes.id))
    .where(eq(recipeNotes.userId, viewer.userId))
    .orderBy(desc(recipeNotes.updatedAt));
  const visible = rows.filter((r) => canView(r.recipe, viewer));
  const summaries = await summariesFor(
    db,
    visible.map((r) => r.recipe),
    locale,
  );
  return visible
    .map((r) => {
      const recipe = summaries.find((s) => s.slug === r.recipe.slug);
      return recipe ? { recipe, body: r.body, updatedAt: r.updatedAt } : null;
    })
    .filter((n): n is NoteEntry => n !== null);
}

export async function isFavorite(db: Database, userId: string, recipeId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: favorites.recipeId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)));
  return Boolean(row);
}

/** Adds or removes a favourite. Returns the new state. */
export async function setFavorite(db: Database, userId: string, recipeId: string, on: boolean): Promise<boolean> {
  if (on) {
    await db.insert(favorites).values({ userId, recipeId }).onConflictDoNothing();
  } else {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)));
  }
  return on;
}

export async function getNote(db: Database, userId: string, recipeId: string): Promise<string> {
  const [row] = await db
    .select({ body: recipeNotes.body })
    .from(recipeNotes)
    .where(and(eq(recipeNotes.userId, userId), eq(recipeNotes.recipeId, recipeId)));
  return row?.body ?? "";
}

/** Saves the note; an empty note is deleted rather than stored. */
export async function saveNote(db: Database, userId: string, recipeId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) {
    await db.delete(recipeNotes).where(and(eq(recipeNotes.userId, userId), eq(recipeNotes.recipeId, recipeId)));
    return;
  }
  await db
    .insert(recipeNotes)
    .values({ userId, recipeId, body: text })
    .onConflictDoUpdate({
      target: [recipeNotes.userId, recipeNotes.recipeId],
      set: { body: text, updatedAt: new Date() },
    });
}

/** The recipe, if this viewer may open it. Checked before saving a favourite or a note. */
export async function viewableRecipe(db: Database, recipeId: string, viewer: Viewer): Promise<Recipe | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  return recipe && canView(recipe, viewer) ? recipe : null;
}

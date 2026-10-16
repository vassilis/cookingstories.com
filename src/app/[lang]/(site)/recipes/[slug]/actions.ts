"use server";

import { db } from "@/db";
import { saveNote, setFavorite, viewableRecipe } from "@/lib/notebook";
import { currentUser } from "@/lib/session";

/*
 * Reader actions on a recipe page. Each one re-reads the session and checks that the reader
 * may open the recipe, so a crafted request can't touch someone else's private recipe.
 * Favourites and notes are per-user and never cached, so there is nothing to refresh.
 */

async function readerFor(recipeId: string, shareToken: string | null) {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first");
  const recipe = await viewableRecipe(db(), recipeId, { userId: user.id, isAdmin: user.isAdmin, shareToken });
  if (!recipe) throw new Error("Recipe not found");
  return user;
}

export async function setFavoriteAction(recipeId: string, on: boolean, shareToken: string | null): Promise<boolean> {
  const user = await readerFor(recipeId, shareToken);
  return setFavorite(db(), user.id, recipeId, on);
}

/** Argument order lets a page bind the recipe and share token, leaving the note text. */
export async function saveNoteAction(recipeId: string, shareToken: string | null, body: string): Promise<void> {
  const user = await readerFor(recipeId, shareToken);
  await saveNote(db(), user.id, recipeId, body.slice(0, 5000));
}

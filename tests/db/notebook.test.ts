import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { user } from "@/db/auth-schema";
import { recipes } from "@/db/schema";
import { getNote, isFavorite, listFavorites, listMyRecipes, listNotes, saveNote, setFavorite } from "@/lib/notebook";
import { anonymous, type Viewer } from "@/lib/recipe-access";
import { queryPublicSummaries, queryRecipeForViewer } from "@/lib/recipe-queries";
import { createUserRecipe, deleteUserRecipe, updateUserRecipe, type UserRecipeInput } from "@/lib/user-recipes";
import { insertRecipe, resetDb, testDb } from "./helpers";

const { db, close } = testDb();
afterAll(close);
beforeEach(() => resetDb(db));

async function makeUser(id: string, role: "user" | "admin" = "user"): Promise<Viewer> {
  await db.insert(user).values({ id, name: id, email: `${id}@example.test`, emailVerified: true, role });
  return { userId: id, isAdmin: role === "admin" };
}

const input = (overrides: Partial<UserRecipeInput> = {}): UserRecipeInput => ({
  title: "Grandma’s lentils",
  description: "",
  story: "From Epirus.",
  ingredients: "250 g lentils\n1 onion",
  steps: "Rinse.\nSimmer for 40 minutes.",
  category: "mains",
  country: "GR",
  needsOven: false,
  visibility: "private",
  locale: "en",
  ...overrides,
});

describe("a reader's own recipes", () => {
  it("are private by default: the author sees them, nobody else does", async () => {
    const ann = await makeUser("ann");
    const bob = await makeUser("bob");
    const recipe = await createUserRecipe(db, ann, input());

    expect(await queryRecipeForViewer(db, recipe.slug, "en", ann)).toMatchObject({ title: "Grandma’s lentils", story: "From Epirus." });
    expect(await queryRecipeForViewer(db, recipe.slug, "en", bob)).toBeNull();
    expect(await queryRecipeForViewer(db, recipe.slug, "en", anonymous)).toBeNull();
    expect(await queryPublicSummaries(db, "en")).toHaveLength(0);
  });

  it("open for anyone with the share link when set to link-only, and stay unlisted", async () => {
    const ann = await makeUser("ann");
    const recipe = await createUserRecipe(db, ann, input({ visibility: "link" }));
    expect(recipe.shareToken).toBeTruthy();

    expect(await queryRecipeForViewer(db, recipe.slug, "en", { ...anonymous, shareToken: recipe.shareToken })).not.toBeNull();
    expect(await queryRecipeForViewer(db, recipe.slug, "en", { ...anonymous, shareToken: "wrong" })).toBeNull();
    expect(await queryPublicSummaries(db, "en")).toHaveLength(0);
  });

  it("keep the same share link when edited", async () => {
    const ann = await makeUser("ann");
    const recipe = await createUserRecipe(db, ann, input({ visibility: "link" }));
    const updated = await updateUserRecipe(db, ann, recipe.slug, input({ visibility: "link", title: "Lentils" }));
    expect(updated.shareToken).toBe(recipe.shareToken);
  });

  it("wait for review when made public, and are listed once an admin approves", async () => {
    const ann = await makeUser("ann");
    const recipe = await createUserRecipe(db, ann, input({ visibility: "public" }));
    expect(recipe.reviewStatus).toBe("pending");
    expect(await queryPublicSummaries(db, "en")).toHaveLength(0);

    await db.update(recipes).set({ reviewStatus: "approved" }).where(eq(recipes.id, recipe.id));
    expect((await queryPublicSummaries(db, "en")).map((r) => r.slug)).toEqual([recipe.slug]);
  });

  it("go back to review when the author edits an approved public recipe", async () => {
    const ann = await makeUser("ann");
    const recipe = await createUserRecipe(db, ann, input({ visibility: "public" }));
    await db.update(recipes).set({ reviewStatus: "approved" }).where(eq(recipes.id, recipe.id));

    const edited = await updateUserRecipe(db, ann, recipe.slug, input({ visibility: "public", title: "Spam now" }));
    expect(edited.reviewStatus).toBe("pending");
    expect(await queryPublicSummaries(db, "en")).toHaveLength(0);
  });

  it("are approved straight away when an admin publishes", async () => {
    const admin = await makeUser("root", "admin");
    const recipe = await createUserRecipe(db, admin, input({ visibility: "public" }));
    expect(recipe.reviewStatus).toBe("approved");
  });

  it("get distinct readable slugs even with the same title", async () => {
    const ann = await makeUser("ann");
    const a = await createUserRecipe(db, ann, input({ title: "Φακές με λεμόνι" }));
    const b = await createUserRecipe(db, ann, input({ title: "Φακές με λεμόνι" }));
    expect(a.slug).toBe("fakes-me-lemoni");
    expect(b.slug).toMatch(/^fakes-me-lemoni-[0-9a-f]{6}$/);
  });

  it("can't be edited or deleted by another reader", async () => {
    const ann = await makeUser("ann");
    const bob = await makeUser("bob");
    const recipe = await createUserRecipe(db, ann, input());
    await expect(updateUserRecipe(db, bob, recipe.slug, input({ title: "Mine now" }))).rejects.toThrow();
    await expect(deleteUserRecipe(db, bob, recipe.slug)).rejects.toThrow();
    expect(await queryRecipeForViewer(db, recipe.slug, "en", ann)).toMatchObject({ title: "Grandma’s lentils" });
  });

  it("can be deleted by their author", async () => {
    const ann = await makeUser("ann");
    const recipe = await createUserRecipe(db, ann, input());
    await deleteUserRecipe(db, ann, recipe.slug);
    expect(await queryRecipeForViewer(db, recipe.slug, "en", ann)).toBeNull();
  });

  it("never let a reader delete the house collection", async () => {
    const admin = await makeUser("root", "admin");
    await insertRecipe(db, { slug: "house", titles: { el: "Σπιτικό" } });
    await expect(deleteUserRecipe(db, admin, "house")).rejects.toThrow();
  });

  it("are listed in the author's notebook with their status", async () => {
    const ann = await makeUser("ann");
    await createUserRecipe(db, ann, input({ title: "One" }));
    await createUserRecipe(db, ann, input({ title: "Two", visibility: "public" }));
    const mine = await listMyRecipes(db, "ann", "en");
    expect(mine.map((r) => [r.title, r.visibility, r.reviewStatus]).sort()).toEqual([
      ["One", "private", "pending"],
      ["Two", "public", "pending"],
    ]);
  });
});

describe("favourites", () => {
  it("toggle on and off, and saving twice is harmless", async () => {
    await makeUser("ann");
    const id = await insertRecipe(db, { slug: "cake", titles: { en: "Cake" }, originalLocale: "en" });
    await setFavorite(db, "ann", id, true);
    await setFavorite(db, "ann", id, true);
    expect(await isFavorite(db, "ann", id)).toBe(true);
    expect((await listFavorites(db, { userId: "ann", isAdmin: false }, "en")).map((r) => r.slug)).toEqual(["cake"]);

    await setFavorite(db, "ann", id, false);
    expect(await isFavorite(db, "ann", id)).toBe(false);
  });

  it("belong to one reader only", async () => {
    await makeUser("ann");
    await makeUser("bob");
    const id = await insertRecipe(db, { slug: "cake", titles: { en: "Cake" }, originalLocale: "en" });
    await setFavorite(db, "ann", id, true);
    expect(await listFavorites(db, { userId: "bob", isAdmin: false }, "en")).toHaveLength(0);
  });

  it("drop out of the list when the author makes the recipe private", async () => {
    const ann = await makeUser("ann");
    await makeUser("bob");
    const recipe = await createUserRecipe(db, ann, input({ visibility: "link" }));
    await setFavorite(db, "bob", recipe.id, true);
    await updateUserRecipe(db, ann, recipe.slug, input({ visibility: "private" }));
    expect(await listFavorites(db, { userId: "bob", isAdmin: false }, "en")).toHaveLength(0);
  });
});

describe("notes in the margin", () => {
  it("are saved, replaced, and deleted when emptied", async () => {
    await makeUser("ann");
    const id = await insertRecipe(db, { slug: "cake", titles: { en: "Cake" }, originalLocale: "en" });
    await saveNote(db, "ann", id, "  Less sugar.  ");
    expect(await getNote(db, "ann", id)).toBe("Less sugar.");
    await saveNote(db, "ann", id, "45 minutes is enough.");
    expect(await getNote(db, "ann", id)).toBe("45 minutes is enough.");
    await saveNote(db, "ann", id, "   ");
    expect(await getNote(db, "ann", id)).toBe("");
    expect(await listNotes(db, { userId: "ann", isAdmin: false }, "en")).toHaveLength(0);
  });

  it("are private to the reader who wrote them", async () => {
    await makeUser("ann");
    await makeUser("bob");
    const id = await insertRecipe(db, { slug: "cake", titles: { en: "Cake" }, originalLocale: "en" });
    await saveNote(db, "ann", id, "Ann's secret");
    expect(await getNote(db, "bob", id)).toBe("");
    expect(await listNotes(db, { userId: "bob", isAdmin: false }, "en")).toHaveLength(0);
    expect((await listNotes(db, { userId: "ann", isAdmin: false }, "en"))[0]).toMatchObject({ body: "Ann's secret" });
  });
});

import { timingSafeEqual } from "node:crypto";
import type { Recipe } from "@/db/schema";

/*
 * Who may see or change a recipe. Pure functions, so the rules are easy to test and read:
 *
 *   public + approved  everyone (and it is listed on the site)
 *   link               anyone who has the share link (never listed)
 *   private            only the author
 *   public, pending    only the author until an admin approves it
 *
 * Admins can see and edit everything; authors can always see and edit their own.
 */

export type Viewer = {
  userId: string | null;
  isAdmin: boolean;
  /** The `share` token from a share link, if the visitor arrived with one. */
  shareToken?: string | null;
};

export const anonymous: Viewer = { userId: null, isAdmin: false };

type AccessFields = Pick<Recipe, "visibility" | "reviewStatus" | "authorId" | "shareToken">;

export const isListed = (r: Pick<Recipe, "visibility" | "reviewStatus">) =>
  r.visibility === "public" && r.reviewStatus === "approved";

export const isAuthor = (r: Pick<Recipe, "authorId">, viewer: Viewer) =>
  viewer.userId !== null && r.authorId === viewer.userId;

export function canView(r: AccessFields, viewer: Viewer): boolean {
  if (viewer.isAdmin || isAuthor(r, viewer) || isListed(r)) return true;
  return r.visibility === "link" && tokensMatch(r.shareToken, viewer.shareToken);
}

export const canEdit = (r: Pick<Recipe, "authorId">, viewer: Viewer) => viewer.isAdmin || isAuthor(r, viewer);

function tokensMatch(expected: string | null, given: string | null | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import type { Viewer } from "@/lib/recipe-access";

export type SignedInUser = { id: string; email: string; name: string; isAdmin: boolean };

/** The signed-in user, or null. Reads the request, so call it inside a Suspense boundary. */
export async function currentUser(): Promise<SignedInUser | null> {
  const requestHeaders = await headers();
  const session = await auth()
    .api.getSession({ headers: requestHeaders })
    .catch(() => null);
  if (!session) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isAdmin: session.user.role === "admin",
  };
}

export async function currentViewer(shareToken?: string | null): Promise<Viewer> {
  const user = await currentUser();
  return { userId: user?.id ?? null, isAdmin: user?.isAdmin ?? false, shareToken: shareToken ?? null };
}

/** Sends signed-out visitors to sign in, then back to `next`. */
export async function requireUser(locale: Locale, next: string): Promise<SignedInUser> {
  const user = await currentUser();
  if (!user) redirect(signInPath(locale, next));
  return user;
}

export const signInPath = (locale: Locale, next: string) =>
  `${localePath(locale, "/sign-in")}?next=${encodeURIComponent(next)}`;

/** Only same-site paths may be used as a post-sign-in destination. */
export function safeNext(value: string | null | undefined, fallback: string): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

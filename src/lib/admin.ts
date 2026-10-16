import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";
import { auth } from "@/lib/auth";

export type AdminUser = { id: string; email: string; name: string };

/**
 * Gate for admin pages and actions. Signed-out visitors go to sign-in; signed-in
 * non-admins get a 404 so the admin area doesn't advertise itself.
 */
export async function requireAdmin(locale: Locale): Promise<AdminUser> {
  const requestHeaders = await headers();
  const session = await auth().api.getSession({ headers: requestHeaders });
  if (!session) redirect(localePath(locale, "/sign-in"));
  if (session.user.role !== "admin") notFound();
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

export async function isAdmin(): Promise<boolean> {
  const requestHeaders = await headers();
  const session = await auth()
    .api.getSession({ headers: requestHeaders })
    .catch(() => null);
  return session?.user.role === "admin";
}

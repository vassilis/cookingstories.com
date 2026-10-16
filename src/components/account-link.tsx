import Link from "next/link";
import { headers } from "next/headers";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { auth } from "@/lib/auth";

/** Reads the session, so it streams in behind a Suspense boundary in the header. */
export async function AccountLink() {
  const locale = await getLocale();
  const dict = await getDictionary();
  // Read the request first: that is what keeps this out of the prerendered shell.
  const requestHeaders = await headers();
  const session = await auth()
    .api.getSession({ headers: requestHeaders })
    .catch(() => null);

  if (!session) {
    return (
      <Link href={localePath(locale, "/sign-in")} className="button button-quiet">
        {dict.nav.signIn}
      </Link>
    );
  }

  return (
    <>
      {session.user.role === "admin" && <Link href={localePath(locale, "/admin")}>{dict.nav.admin}</Link>}
      <Link href={localePath(locale, "/notebook")} className="button button-quiet">
        {dict.nav.notebook}
      </Link>
    </>
  );
}

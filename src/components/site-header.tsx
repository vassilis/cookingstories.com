import Link from "next/link";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { AccountLink } from "./account-link";
import { LanguageSwitcher } from "./language-switcher";
import styles from "./site-header.module.css";

export async function SiteHeader() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const home = localePath(locale, "/");

  return (
    <header className={`container ${styles.header} no-print`}>
      <Link href={home} className={styles.logo}>
        Cooking Stories
      </Link>
      <nav aria-label={dict.nav.recipes} className={styles.nav}>
        <Link href={`${home === "/" ? "" : home}/#contents`}>{dict.nav.recipes}</Link>
        <Link href={`${home === "/" ? "" : home}/#world`}>{dict.nav.world}</Link>
        {/* Reads the URL, which is only known at request time on dynamic routes. */}
        <Suspense fallback={<span style={{ fontSize: 15, fontWeight: 600 }}>{locale.toUpperCase()}</span>}>
          <LanguageSwitcher locale={locale} label={dict.nav.language} />
        </Suspense>
        <Suspense fallback={<span className={styles.accountPlaceholder} />}>
          <AccountLink />
        </Suspense>
      </nav>
    </header>
  );
}

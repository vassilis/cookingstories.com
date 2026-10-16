import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { format, getDictionary, getLocale } from "@/i18n/get-dictionary";
import { requireAdmin } from "@/lib/admin";
import { listRecipesForAdmin } from "@/lib/admin-recipes";
import { SignOutButton } from "./sign-out-button";
import styles from "./admin.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.admin.title, robots: { index: false } };
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <RecipeList />
    </Suspense>
  );
}

async function RecipeList() {
  const locale = await getLocale();
  const user = await requireAdmin(locale);
  const dict = await getDictionary();
  const rows = await listRecipesForAdmin(locale);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.top}>
        <h1 className={styles.title}>{dict.admin.recipes}</h1>
        <p className={styles.account}>
          {format(dict.admin.signedInAs, { email: user.email })} <SignOutButton label={dict.admin.signOut} home={localePath(locale, "/")} />
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{dict.admin.colTitle}</th>
              <th scope="col">{dict.admin.colCategory}</th>
              <th scope="col">{dict.admin.colCountry}</th>
              <th scope="col">{dict.admin.colLanguages}</th>
              <th scope="col">{dict.admin.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td>
                  <Link href={localePath(locale, `/admin/recipes/${r.slug}`)} className={styles.rowTitle}>
                    {r.title}
                  </Link>
                </td>
                <td>{dict.categories[r.category]}</td>
                <td>{r.country ? regions.of(r.country) : ""}</td>
                <td>
                  {r.locales.map((l) => (
                    <span key={l.locale} className={l.machineTranslated ? styles.langMachine : styles.lang} title={l.machineTranslated ? dict.admin.machine : undefined}>
                      {languages.of(l.locale)}
                    </span>
                  ))}
                </td>
                <td>
                  {dict.admin.visibility[r.visibility]} · {dict.admin.review[r.reviewStatus]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

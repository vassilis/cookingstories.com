import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/session";
import { RecipeForm } from "../recipe-form";
import styles from "../notebook.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.editor.newTitle, robots: { index: false } };
}

export default function NewRecipePage(props: PageProps<"/[lang]/notebook/new">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <NewRecipe searchParams={props.searchParams} />
    </Suspense>
  );
}

async function NewRecipe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getLocale();
  await requireUser(locale, localePath(locale, "/notebook/new"));
  const dict = await getDictionary();
  const query = await searchParams;

  return (
    <main className={`container ${styles.page}`}>
      <nav className={styles.crumbs}>
        <Link href={localePath(locale, "/notebook")}>{dict.notebook.title}</Link>
      </nav>
      <h1 className={styles.title}>{dict.editor.newTitle}</h1>
      <RecipeForm dict={dict} uiLocale={locale} invalid={query.error === "invalid"} />
    </main>
  );
}

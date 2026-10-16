import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/session";
import { loadForEdit } from "@/lib/user-recipes";
import { RecipeForm } from "../../../recipe-form";
import styles from "../../../notebook.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.editor.editTitle, robots: { index: false } };
}

export default function EditRecipePage(props: PageProps<"/[lang]/notebook/recipes/[slug]/edit">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <EditRecipe params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function EditRecipe({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const { slug } = await params;
  const user = await requireUser(locale, localePath(locale, `/notebook/recipes/${slug}/edit`));
  const dict = await getDictionary();
  const query = await searchParams;

  const found = await loadForEdit(db(), { userId: user.id, isAdmin: user.isAdmin }, slug);
  if (!found) notFound();
  const { recipe, text } = found;

  const base = process.env.BETTER_AUTH_URL ?? "";
  const shareUrl = recipe.shareToken
    ? `${base}${localePath(locale, `/recipes/${recipe.slug}`)}?share=${recipe.shareToken}`
    : null;

  return (
    <main className={`container ${styles.page}`}>
      <nav className={styles.crumbs}>
        <Link href={localePath(locale, "/notebook")}>{dict.notebook.title}</Link>
        {" · "}
        <Link href={`${localePath(locale, `/recipes/${recipe.slug}`)}${recipe.shareToken ? `?share=${recipe.shareToken}` : ""}`}>
          {dict.notebook.view}
        </Link>
      </nav>
      <h1 className={styles.title}>{text?.title ?? dict.editor.editTitle}</h1>
      <RecipeForm
        dict={dict}
        uiLocale={locale}
        recipe={recipe}
        text={text}
        shareUrl={shareUrl}
        saved={query.saved === "1"}
        invalid={query.error === "invalid"}
      />
    </main>
  );
}

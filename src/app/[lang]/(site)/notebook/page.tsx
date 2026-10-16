import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/get-dictionary";
import { listFavorites, listMyRecipes, listNotes, type MyRecipe } from "@/lib/notebook";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "../admin/sign-out-button";
import styles from "./notebook.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.notebook.title, robots: { index: false } };
}

export default function NotebookPage() {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <Notebook />
    </Suspense>
  );
}

function statusLabel(dict: Dictionary, r: Pick<MyRecipe, "visibility" | "reviewStatus">) {
  if (r.visibility !== "public") return dict.notebook.status[r.visibility];
  return dict.notebook.status[r.reviewStatus];
}

async function Notebook() {
  const locale = await getLocale();
  const user = await requireUser(locale, localePath(locale, "/notebook"));
  const dict = await getDictionary();
  const viewer = { userId: user.id, isAdmin: user.isAdmin };
  const [mine, favorites, notes] = await Promise.all([
    listMyRecipes(db(), user.id, locale),
    listFavorites(db(), viewer, locale),
    listNotes(db(), viewer, locale),
  ]);
  const href = (slug: string) => localePath(locale, `/recipes/${slug}`);
  const n = dict.notebook;

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.top}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{n.title}</h1>
          <p>{n.intro}</p>
        </div>
        <p className={styles.account}>
          {user.email} <SignOutButton label={dict.admin.signOut} home={localePath(locale, "/")} />
        </p>
      </div>

      <section aria-labelledby="mine" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="mine">{n.myRecipes}</h2>
          <Link href={localePath(locale, "/notebook/new")} className="button button-primary">
            {n.newRecipe}
          </Link>
        </div>
        {mine.length === 0 ? (
          <p className={styles.empty}>
            {n.noRecipes} <Link href={localePath(locale, "/notebook/new")}>{n.writeFirst}</Link>
          </p>
        ) : (
          <ul className={styles.cards}>
            {mine.map((r) => (
              <li key={r.slug} className={styles.card}>
                <span aria-hidden="true" className={styles.marginLine} />
                <span className="eyebrow">{dict.categories[r.category]}</span>
                <Link href={href(r.slug)} className={styles.cardTitle}>
                  {r.title}
                </Link>
                <span className={styles.badges}>
                  <span className={styles.badge}>{statusLabel(dict, r)}</span>
                </span>
                <span className={styles.cardActions}>
                  <Link href={localePath(locale, `/notebook/recipes/${r.slug}/edit`)}>{n.edit}</Link>
                  <Link href={href(r.slug)}>{n.view}</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="favorites" className={styles.section}>
        <h2 id="favorites">{n.favorites}</h2>
        {favorites.length === 0 ? (
          <p className={styles.empty}>{n.noFavorites}</p>
        ) : (
          <ul className={styles.list}>
            {favorites.map((r) => (
              <li key={r.slug}>
                <Link href={href(r.slug)}>{r.title}</Link>
                <span>{dict.categories[r.category]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes" className={styles.section}>
        <h2 id="notes">{n.notes}</h2>
        {notes.length === 0 ? (
          <p className={styles.empty}>{n.noNotes}</p>
        ) : (
          <ul className={styles.notes}>
            {notes.map((note) => (
              <li key={note.recipe.slug} className={styles.noteCard}>
                <Link href={href(note.recipe.slug)} className={styles.cardTitle}>
                  {note.recipe.title}
                </Link>
                <p className={styles.noteBody}>{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

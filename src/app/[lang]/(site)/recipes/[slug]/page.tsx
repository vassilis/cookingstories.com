import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipeNotes } from "@/components/recipe-notes";
import { db } from "@/db";
import { isLocale, localePath } from "@/i18n/config";
import { format, getDictionary, getLocale, type Dictionary } from "@/i18n/get-dictionary";
import { getNote, isFavorite } from "@/lib/notebook";
import { canEdit, isAuthor, isListed } from "@/lib/recipe-access";
import { getPublicRecipe, getRecipeForPage, type RecipeDetail } from "@/lib/recipes";
import { currentUser, signInPath } from "@/lib/session";
import { saveNoteAction } from "./actions";
import { FavoriteButton, HeartIcon } from "./favorite-button";
import { IngredientChecklist } from "./ingredient-checklist";
import { PrintButton } from "./print-button";
import styles from "./recipe.module.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublicRecipe(slug, await getLocale());
  // Only listed recipes get a title and description; private and shared ones stay unindexed.
  if (!recipe) return { robots: { index: false } };
  return {
    title: recipe.title,
    description: recipe.description ?? undefined,
    alternates: {
      languages: { en: `/recipes/${slug}`, el: `/el/recipes/${slug}` },
    },
  };
}

export default function RecipePage({ params, searchParams }: PageProps<"/[lang]/recipes/[slug]">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <Recipe params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function visibilityNotice(dict: Dictionary, recipe: RecipeDetail): string | null {
  if (isListed(recipe)) return null;
  if (recipe.visibility === "private") return dict.recipeTools.onlyYou;
  if (recipe.visibility === "link") return dict.recipeTools.onlyLink;
  return recipe.reviewStatus === "rejected" ? dict.recipeTools.rejected : dict.recipeTools.pending;
}

async function Recipe({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const shareToken = typeof query.share === "string" ? query.share : null;
  const locale = await getLocale();
  const dict = await getDictionary();
  const recipe = await getRecipeForPage(slug, locale, shareToken);
  if (!recipe) notFound();

  const user = await currentUser();
  const viewer = { userId: user?.id ?? null, isAdmin: user?.isAdmin ?? false };
  const [favorite, note] = user
    ? await Promise.all([isFavorite(db(), user.id, recipe.id), getNote(db(), user.id, recipe.id)])
    : [false, ""];

  const recipeHref = (s: string) => localePath(locale, `/recipes/${s}`);
  const shareQuery = shareToken && recipe.visibility === "link" ? `?share=${encodeURIComponent(shareToken)}` : "";
  const thisPage = `${recipeHref(recipe.slug)}${shareQuery}`;
  const home = localePath(locale, "/");
  // Tags open the home page contents with that category or country highlighted.
  const filterHref = (key: "category" | "country", value: string) => `${home}?${key}=${value}#contents`;
  const countryName = recipe.country
    ? (new Intl.DisplayNames([locale], { type: "region" }).of(recipe.country) ?? recipe.country)
    : null;
  const original = isLocale(recipe.originalLocale) ? recipe.originalLocale : null;
  const notice = visibilityNotice(dict, recipe);
  // Authors edit in their notebook; admins edit the house collection in the admin area.
  const editHref = canEdit(recipe, viewer)
    ? isAuthor(recipe, viewer)
      ? localePath(locale, `/notebook/recipes/${recipe.slug}/edit`)
      : localePath(locale, `/admin/recipes/${recipe.slug}`)
    : null;
  const t = dict.recipeTools;

  return (
    <main className={`container ${styles.page}`} lang={recipe.contentLocale}>
      <header className={styles.intro}>
        <div className={styles.head}>
          <nav aria-label={dict.nav.recipes} className={`${styles.breadcrumb} no-print`}>
            <Link href={`${home}#contents`}>{dict.nav.recipes}</Link>
            {" / "}
            <Link href={filterHref("category", recipe.category)}>{dict.categories[recipe.category]}</Link>
          </nav>
          <h1 className={styles.title}>{recipe.title}</h1>
          {recipe.description && <p className={styles.description}>{recipe.description}</p>}
        </div>

        {notice && (
          <p className={`${styles.notice} no-print`} role="note">
            {notice}
          </p>
        )}

        <div className={styles.toolbar}>
          <p className={styles.tags}>
            <Link href={filterHref("category", recipe.category)} className={styles.tag}>
              {dict.categories[recipe.category]}
            </Link>
            {recipe.country && countryName && (
              <Link href={filterHref("country", recipe.country)} className={styles.tag}>
                {countryName}
              </Link>
            )}
          </p>
          <p className={styles.meta}>
            <span>{format(dict.recipe.ingredientCount, { count: recipe.ingredientCount })}</span>
            <span>{format(dict.recipe.stepCount, { count: recipe.stepCount })}</span>
            {recipe.needsOven && <span>{dict.recipe.needsOven}</span>}
          </p>
          {recipe.translated && original && (
            <p className={`${styles.translated} no-print`}>
              {format(dict.recipe.translatedFrom, {
                language: new Intl.DisplayNames([locale], { type: "language" }).of(original) ?? original,
              })}{" "}
              <Link href={localePath(original, `/recipes/${recipe.slug}`)} hrefLang={original}>
                {dict.recipe.readOriginal}
              </Link>
            </p>
          )}
          <div className={`${styles.toolbarEnd} no-print`}>
            <a
              href={`${recipeHref(recipe.slug)}/cook${shareQuery}`}
              target="_blank"
              rel="noopener"
              className="button button-primary"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l14 8-14 8z" />
              </svg>
              {t.cook}
            </a>
            {user ? (
              <FavoriteButton
                recipeId={recipe.id}
                initial={favorite}
                shareToken={shareToken}
                labels={{ save: t.save, saved: t.saved }}
              />
            ) : (
              <Link href={signInPath(locale, thisPage)} className="button button-quiet">
                <HeartIcon filled={false} />
                {t.signInToSave}
              </Link>
            )}
            {editHref && (
              <Link href={editHref} className="button button-quiet">
                {t.edit}
              </Link>
            )}
            <PrintButton label={dict.recipe.print} />
          </div>
        </div>
      </header>

      {recipe.story && (
        <section className={styles.story} aria-labelledby="story-title">
          <h2 id="story-title" className={styles.sectionTitle}>
            {t.story}
          </h2>
          <p>{recipe.story}</p>
        </section>
      )}

      <div className={styles.body}>
        <aside className={styles.ingredients} aria-labelledby="ingredients-title">
          <span aria-hidden="true" className={styles.marginLine} />
          <IngredientChecklist
            slug={recipe.slug}
            groups={recipe.ingredients}
            title={dict.recipe.ingredients}
            progressTemplate={dict.recipe.checked}
          />
        </aside>

        <section className={styles.method} aria-labelledby="method-title">
          <h2 id="method-title" className={styles.sectionTitle}>
            {dict.recipe.method}
          </h2>
          <ol className={styles.steps}>
            {recipe.steps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {i + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={`${styles.notes} no-print`} aria-labelledby="notes-title">
        <div className={styles.notesHead}>
          <h2 id="notes-title" className={styles.sectionTitle}>
            {t.notesTitle}
          </h2>
          <span>{t.notesHint}</span>
        </div>
        {user ? (
          <RecipeNotes
            initial={note}
            save={saveNoteAction.bind(null, recipe.id, shareToken)}
            labels={{ placeholder: t.notesPlaceholder, save: t.notesSave, saved: t.notesSaved, error: t.notesError }}
          />
        ) : (
          <p>
            <Link href={signInPath(locale, thisPage)}>{t.notesSignIn}</Link>
          </p>
        )}
      </section>

      {(recipe.previous || recipe.next) && (
        <nav aria-label={dict.nav.recipes} className={`${styles.pager} no-print`}>
          {recipe.previous ? (
            <Link href={recipeHref(recipe.previous.slug)} className={styles.pagerLink}>
              <span>← {dict.recipe.previous}</span>
              <strong>{recipe.previous.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {recipe.next && (
            <Link href={recipeHref(recipe.next.slug)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
              <span>{dict.recipe.next} →</span>
              <strong>{recipe.next.title}</strong>
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isLocale, localePath } from "@/i18n/config";
import { format, getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPublicRecipe } from "@/lib/recipes";
import { IngredientChecklist } from "./ingredient-checklist";
import { PrintButton } from "./print-button";
import styles from "./recipe.module.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublicRecipe(slug, await getLocale());
  if (!recipe) return {};
  return {
    title: recipe.title,
    description: recipe.description ?? undefined,
    alternates: {
      languages: { en: `/recipes/${slug}`, el: `/el/recipes/${slug}` },
    },
  };
}

export default function RecipePage({ params }: PageProps<"/[lang]/recipes/[slug]">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <Recipe params={params} />
    </Suspense>
  );
}

async function Recipe({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const recipe = await getPublicRecipe(slug, locale);
  if (!recipe) notFound();

  const recipeHref = (s: string) => localePath(locale, `/recipes/${s}`);
  const home = localePath(locale, "/");
  // Tags open the home page contents with that category or country highlighted.
  const filterHref = (key: "category" | "country", value: string) => `${home}?${key}=${value}#contents`;
  const countryName = recipe.country
    ? (new Intl.DisplayNames([locale], { type: "region" }).of(recipe.country) ?? recipe.country)
    : null;
  const original = isLocale(recipe.originalLocale) ? recipe.originalLocale : null;

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
            <PrintButton label={dict.recipe.print} />
          </div>
        </div>
      </header>

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

import Link from "next/link";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { format, getDictionary, getLocale, type Dictionary } from "@/i18n/get-dictionary";
import { getRecipeIndex, getRecipeOfTheDay } from "@/lib/recipes";
import { ContentsFilter, type ContentsGroup } from "./contents-filter";
import styles from "./home.module.css";

export default async function HomePage() {
  const dict = await getDictionary();
  const locale = await getLocale();
  // Both open the notebook; signed-out visitors are sent to sign in first and come back.
  const newRecipe = localePath(locale, "/notebook/new");
  const notebook = localePath(locale, "/notebook");

  return (
    <main>
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroText}>
          <span className="eyebrow">{dict.home.eyebrow}</span>
          <h1 className={styles.heroTitle}>{dict.home.title}</h1>
          <p className={styles.heroIntro}>{dict.home.intro}</p>
          <div className={styles.actions}>
            <a href="#contents" className="button button-primary">
              {dict.home.browse}
            </a>
            <Link href={newRecipe} className="button">
              {dict.home.writeYourOwn}
            </Link>
          </div>
        </div>
        <Suspense fallback={<div className={`${styles.daySheet} ${styles.placeholder}`} />}>
          <RecipeOfTheDay />
        </Suspense>
      </section>

      <section id="contents" className={styles.contentsBand} aria-labelledby="contents-title">
        <div className="container">
          <Suspense fallback={<h2 id="contents-title" className={styles.sectionTitle}>{dict.home.contents}</h2>}>
            <Contents />
          </Suspense>
        </div>
      </section>

      <section id="world" className="container" aria-labelledby="world-title" style={{ paddingBlock: "var(--space-section)" }}>
        <div className={styles.sectionIntro}>
          <span className="eyebrow">{dict.home.worldEyebrow}</span>
          <h2 id="world-title" className={styles.sectionTitle}>
            {dict.home.worldTitle}
          </h2>
          <p>{dict.home.worldIntro}</p>
        </div>
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </section>

      <section id="notebook" className={styles.notebook}>
        <div className={`container ${styles.notebookInner}`}>
          <div className={styles.sectionIntro}>
            <span className="eyebrow" style={{ color: "var(--red-on-ink)" }}>
              {dict.home.notebookEyebrow}
            </span>
            <h2 className={styles.sectionTitle}>{dict.home.notebookTitle}</h2>
            <p>{dict.home.notebookIntro}</p>
          </div>
          <Link href={notebook} className={`button ${styles.notebookCta}`}>
            {dict.home.notebookCta}
          </Link>
        </div>
      </section>
    </main>
  );
}

async function RecipeOfTheDay() {
  const dict = await getDictionary();
  const locale = await getLocale();
  const recipe = await getRecipeOfTheDay(locale);
  if (!recipe) return null;

  return (
    <article className={styles.daySheet}>
      <span aria-hidden="true" className={styles.marginLine} />
      <span className="eyebrow">{dict.home.recipeOfTheDay}</span>
      <h2 className={styles.dayTitle}>{recipe.title}</h2>
      {recipe.description && <p className={styles.dayDescription}>{recipe.description}</p>}
      <p className={styles.meta}>
        <span>{dict.categories[recipe.category]}</span>
        <span>{format(dict.recipe.ingredientCount, { count: recipe.ingredientCount })}</span>
        <span>{format(dict.recipe.stepCount, { count: recipe.stepCount })}</span>
      </p>
      <Link href={localePath(locale, `/recipes/${recipe.slug}`)} className={styles.dayLink}>
        {dict.home.openRecipe}
      </Link>
    </article>
  );
}

async function Contents() {
  const dict = await getDictionary();
  const locale = await getLocale();
  const { byCategory, byCountry } = await getRecipeIndex(locale);
  const names = new Intl.DisplayNames([locale], { type: "region" });
  // Numbers run on across categories, like page numbers in a table of contents.
  const offsets = byCategory.map((_, i) => byCategory.slice(0, i).reduce((n, g) => n + g.recipes.length, 0));

  const groups: ContentsGroup[] = byCategory.map((g, gi) => ({
    category: g.category,
    label: dict.categories[g.category],
    recipes: g.recipes.map((r, ri) => ({
      slug: r.slug,
      href: localePath(locale, `/recipes/${r.slug}`),
      title: r.title,
      number: String(offsets[gi] + ri + 1).padStart(2, "0"),
      country: r.country,
      needsOven: r.needsOven,
    })),
  }));
  const countries = byCountry.map((c) => ({ value: c.country, label: names.of(c.country) ?? c.country, count: c.count }));

  return (
    <ContentsFilter
      groups={groups}
      countries={countries}
      labels={{
        title: dict.home.contents,
        all: dict.home.all,
        category: dict.home.filterCategory,
        country: dict.home.filterCountry,
        anyCountry: dict.home.anyCountry,
        kitchen: dict.home.filterKitchen,
        noOven: dict.home.noOven,
        filters: dict.home.filters,
        matches: dict.home.matches,
      }}
    />
  );
}

// Countries we'd like stories from next, shown as open invitations.
const INVITES: { country: string; region: keyof Dictionary["regions"] }[] = [
  { country: "MX", region: "americas" },
  { country: "IN", region: "asia" },
  { country: "LB", region: "middleEast" },
];
const REGION_OF: Record<string, keyof Dictionary["regions"]> = {
  GR: "europe",
  IT: "europe",
  FR: "europe",
  US: "americas",
  MX: "americas",
  IN: "asia",
  LB: "middleEast",
};

async function World() {
  const dict = await getDictionary();
  const locale = await getLocale();
  const { byCountry } = await getRecipeIndex(locale);
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const newRecipe = localePath(locale, "/notebook/new");
  const home = localePath(locale, "/");
  const open = INVITES.filter((i) => !byCountry.some((c) => c.country === i.country));

  return (
    <div className={styles.places}>
      {byCountry.map((c) => (
        <Link key={c.country} href={`${home}?country=${c.country}#contents`} className={styles.place}>
          <span className="eyebrow">{dict.regions[REGION_OF[c.country] ?? "anywhere"]}</span>
          <span className={styles.placeName}>{names.of(c.country)}</span>
          <span className={styles.placeExamples}>{c.examples.join(", ")}</span>
        </Link>
      ))}
      {open.map((i) => (
        <Link key={i.country} href={newRecipe} className={`${styles.place} ${styles.placeEmpty}`}>
          <span className="eyebrow">{dict.regions[i.region]}</span>
          <span className={styles.placeName}>{names.of(i.country)}</span>
          <span className={styles.placeInvite}>{dict.home.worldEmpty}</span>
        </Link>
      ))}
      <Link href={newRecipe} className={`${styles.place} ${styles.placeEmpty}`}>
        <span className="eyebrow">{dict.regions.anywhere}</span>
        <span className={styles.placeName}>{dict.home.yourCorner}</span>
        <span className={styles.placeInvite}>{dict.home.worldEmpty}</span>
      </Link>
    </div>
  );
}

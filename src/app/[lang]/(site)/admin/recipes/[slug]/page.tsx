import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CATEGORIES } from "@/db/seed-types";
import { isLocale, localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { requireAdmin } from "@/lib/admin";
import { getRecipeForEdit } from "@/lib/admin-recipes";
import { ingredientsToText, stepsToText } from "@/lib/recipe-text";
import { saveRecipe } from "../../actions";
import styles from "../../admin.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.admin.edit, robots: { index: false } };
}

export default function EditRecipePage(props: PageProps<"/[lang]/admin/recipes/[slug]">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" />}>
      <Editor params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const uiLocale = await getLocale();
  await requireAdmin(uiLocale);
  const dict = await getDictionary();
  const { slug } = await params;
  const query = await searchParams;

  const found = await getRecipeForEdit(slug);
  if (!found) notFound();
  const { recipe, translations } = found;

  // Which language version is being edited (?locale=el), defaulting to the admin UI language.
  const requested = typeof query.locale === "string" ? query.locale : uiLocale;
  const textLocale = isLocale(requested) ? requested : uiLocale;
  const text = translations.find((t) => t.locale === textLocale);
  const saved = query.saved === "1";
  const languages = new Intl.DisplayNames([uiLocale], { type: "language" });
  const editHref = (l: string) => `${localePath(uiLocale, `/admin/recipes/${slug}`)}?locale=${l}`;

  return (
    <main className={`container ${styles.page}`}>
      <nav className={styles.crumbs}>
        <Link href={localePath(uiLocale, "/admin")}>{dict.admin.allRecipes}</Link>
        {" · "}
        <Link href={localePath(textLocale, `/recipes/${slug}`)}>{dict.admin.viewPage}</Link>
      </nav>
      <h1 className={styles.title}>{text?.title ?? slug}</h1>

      {saved && (
        <p role="status" className={styles.saved}>
          {dict.admin.saved}
        </p>
      )}

      <form action={saveRecipe} className={styles.form}>
        <input type="hidden" name="uiLocale" value={uiLocale} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="locale" value={textLocale} />

        <section className={styles.panel}>
          <div className={styles.langTabs} role="group" aria-label={dict.admin.textIn}>
            <span className={styles.langTabsLabel}>{dict.admin.textIn}</span>
            {locales.map((l) => {
              const t = translations.find((x) => x.locale === l);
              return (
                <Link
                  key={l}
                  href={editHref(l)}
                  aria-current={l === textLocale ? "page" : undefined}
                  className={l === textLocale ? `${styles.langTab} ${styles.langTabActive}` : styles.langTab}
                >
                  {languages.of(l)}
                  <small>{!t ? dict.admin.missing : t.machineTranslated ? dict.admin.machine : ""}</small>
                </Link>
              );
            })}
          </div>

          {text?.machineTranslated && <p className={styles.note}>{dict.admin.machineNote}</p>}

          <label className={styles.field}>
            <span>{dict.admin.fieldTitle}</span>
            <input name="title" required defaultValue={text?.title ?? ""} lang={textLocale} />
          </label>
          <label className={styles.field}>
            <span>{dict.admin.fieldDescription}</span>
            <textarea name="description" rows={2} defaultValue={text?.description ?? ""} lang={textLocale} />
          </label>
          <label className={styles.field}>
            <span>{dict.admin.fieldIngredients}</span>
            <textarea
              name="ingredients"
              rows={14}
              defaultValue={text ? ingredientsToText(text.ingredients) : ""}
              lang={textLocale}
              className={styles.mono}
            />
            <small>{dict.admin.ingredientsHint}</small>
          </label>
          <label className={styles.field}>
            <span>{dict.admin.fieldSteps}</span>
            <textarea name="steps" rows={14} defaultValue={text ? stepsToText(text.steps) : ""} lang={textLocale} />
            <small>{dict.admin.stepsHint}</small>
          </label>
        </section>

        <section className={`${styles.panel} ${styles.details}`}>
          <h2 className={styles.panelTitle}>{dict.admin.details}</h2>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>{dict.admin.fieldCategory}</span>
              <select name="category" defaultValue={recipe.category}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {dict.categories[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{dict.admin.fieldCountry}</span>
              <input name="country" defaultValue={recipe.country ?? ""} maxLength={2} pattern="[A-Za-z]{2}" />
              <small>{dict.admin.countryHint}</small>
            </label>
            <label className={styles.field}>
              <span>{dict.admin.fieldVisibility}</span>
              <select name="visibility" defaultValue={recipe.visibility}>
                {(["private", "link", "public"] as const).map((v) => (
                  <option key={v} value={v}>
                    {dict.admin.visibility[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{dict.admin.fieldReview}</span>
              <select name="reviewStatus" defaultValue={recipe.reviewStatus}>
                {(["pending", "approved", "rejected"] as const).map((v) => (
                  <option key={v} value={v}>
                    {dict.admin.review[v]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="needsOven" defaultChecked={recipe.needsOven} />
            {dict.admin.fieldNeedsOven}
          </label>
        </section>

        <div className={styles.actions}>
          <button type="submit" className="button button-primary">
            {dict.admin.save}
          </button>
        </div>
      </form>
    </main>
  );
}

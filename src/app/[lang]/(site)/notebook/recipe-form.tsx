import { CATEGORIES } from "@/db/seed-types";
import type { Recipe, RecipeTranslation } from "@/db/schema";
import { localeNames, locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { ingredientsToText, stepsToText } from "@/lib/recipe-text";
import { deleteRecipeAction, saveRecipeAction } from "./actions";
import { CopyLink, DeleteRecipe } from "./recipe-form-controls";
import styles from "./notebook.module.css";

const VISIBILITIES = ["private", "link", "public"] as const;

/**
 * The reader's recipe editor, for a new recipe or one of their own. A plain server-rendered
 * form: required fields are checked by the browser, and again on the server.
 */
export function RecipeForm({
  dict,
  uiLocale,
  recipe,
  text,
  shareUrl,
  saved,
  invalid,
}: {
  dict: Dictionary;
  uiLocale: Locale;
  recipe?: Recipe;
  text?: RecipeTranslation | null;
  shareUrl?: string | null;
  saved?: boolean;
  invalid?: boolean;
}) {
  const e = dict.editor;
  const visibility = recipe?.visibility ?? "private";
  const writtenIn = (recipe?.originalLocale as Locale | undefined) ?? uiLocale;

  return (
    <>
      {saved && (
        <p role="status" className={styles.saved}>
          {e.saved}
        </p>
      )}
      {invalid && (
        <p role="alert" className={styles.invalid}>
          {e.invalid}
        </p>
      )}

      <form action={saveRecipeAction} className={styles.form}>
        <input type="hidden" name="uiLocale" value={uiLocale} />
        {recipe && <input type="hidden" name="slug" value={recipe.slug} />}

        <div className={styles.main}>
          <label className={styles.titleField}>
            <span className="eyebrow">{e.title}</span>
            <input name="title" required maxLength={200} placeholder={e.titlePlaceholder} defaultValue={text?.title ?? ""} />
          </label>

          <label className={styles.field}>
            <span>{e.description}</span>
            <textarea name="description" rows={2} maxLength={500} defaultValue={text?.description ?? ""} />
            <small>{e.descriptionHint}</small>
          </label>

          <label className={`${styles.field} ${styles.storySheet}`}>
            <span>{e.story}</span>
            <textarea name="story" rows={5} maxLength={5000} defaultValue={text?.story ?? ""} className={styles.ruled} />
            <small>{e.storyHint}</small>
          </label>

          <label className={styles.field}>
            <span>{e.ingredients}</span>
            <textarea name="ingredients" rows={10} required defaultValue={text ? ingredientsToText(text.ingredients) : ""} />
            <small>{e.ingredientsHint}</small>
          </label>

          <label className={styles.field}>
            <span>{e.steps}</span>
            <textarea name="steps" rows={10} required defaultValue={text ? stepsToText(text.steps) : ""} />
            <small>{e.stepsHint}</small>
          </label>
        </div>

        <aside className={styles.side}>
          <fieldset className={styles.panel}>
            <legend>{e.visibility}</legend>
            {VISIBILITIES.map((v) => (
              <label key={v} className={styles.choice}>
                <input type="radio" name="visibility" value={v} defaultChecked={visibility === v} />
                <span>
                  <strong>{e.visibilityOptions[v].title}</strong>
                  <small>{e.visibilityOptions[v].text}</small>
                </span>
              </label>
            ))}
            <p className={styles.note}>{e.reviewNote}</p>
            {shareUrl && visibility === "link" && (
              <div className={styles.share}>
                <span>{e.shareLink}</span>
                <CopyLink url={shareUrl} labels={{ field: e.shareLink, copy: e.copy, copied: e.copied }} />
                <small>{e.shareHint}</small>
              </div>
            )}
          </fieldset>

          <fieldset className={styles.panel}>
            <legend>{e.basics}</legend>
            <label className={styles.field}>
              <span>{e.category}</span>
              <select name="category" defaultValue={recipe?.category ?? "mains"}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {dict.categories[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{e.country}</span>
              <input name="country" maxLength={2} pattern="[A-Za-z]{2}" defaultValue={recipe?.country ?? ""} />
              <small>{e.countryHint}</small>
            </label>
            {recipe ? (
              <input type="hidden" name="locale" value={writtenIn} />
            ) : (
              <label className={styles.field}>
                <span>{e.language}</span>
                <select name="locale" defaultValue={writtenIn}>
                  {locales.map((l) => (
                    <option key={l} value={l}>
                      {localeNames[l]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={styles.check}>
              <input type="checkbox" name="needsOven" defaultChecked={recipe?.needsOven ?? false} />
              {e.needsOven}
            </label>
          </fieldset>

          <button type="submit" className="button button-primary">
            {e.save}
          </button>
        </aside>
      </form>

      {recipe && (
        <DeleteRecipe
          action={deleteRecipeAction}
          slug={recipe.slug}
          uiLocale={uiLocale}
          labels={{ delete: e.delete, confirm: e.deleteConfirm, warning: e.deleteWarning, cancel: e.cancel }}
        />
      )}
    </>
  );
}

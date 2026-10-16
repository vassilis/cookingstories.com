import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getNote } from "@/lib/notebook";
import { getPublicRecipe, getRecipeForPage } from "@/lib/recipes";
import { currentUser } from "@/lib/session";
import { saveNoteAction } from "../../../../(site)/recipes/[slug]/actions";
import { CookAssistant } from "./cook-assistant";

export async function generateMetadata({ params }: PageProps<"/[lang]/recipes/[slug]/cook">): Promise<Metadata> {
  const { slug } = await params;
  const dict = await getDictionary();
  const recipe = await getPublicRecipe(slug, await getLocale());
  return { title: recipe ? `${dict.cook.title} · ${recipe.title}` : dict.cook.title, robots: { index: false } };
}

export default function CookPage(props: PageProps<"/[lang]/recipes/[slug]/cook">) {
  return (
    <Suspense fallback={<main aria-busy="true" style={{ minHeight: "100vh" }} />}>
      <Cook params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Cook({
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
  const note = user ? await getNote(db(), user.id, recipe.id) : null;
  const shareQuery = shareToken && recipe.visibility === "link" ? `?share=${encodeURIComponent(shareToken)}` : "";
  const c = dict.cook;

  return (
    <div lang={recipe.contentLocale}>
      <CookAssistant
        title={recipe.title}
        slug={recipe.slug}
        groups={recipe.ingredients}
        steps={recipe.steps}
        recipeHref={`${localePath(locale, `/recipes/${recipe.slug}`)}${shareQuery}`}
        note={note === null ? null : { initial: note, save: saveNoteAction.bind(null, recipe.id, shareToken) }}
        labels={{
          close: c.close,
          ingredients: c.ingredients,
          checked: dict.recipe.checked,
          start: c.start,
          stepCount: dict.recipe.stepCount,
          step: c.step,
          back: c.back,
          next: c.next,
          finish: c.finish,
          timer: c.timer,
          startTimer: c.startTimer,
          pauseTimer: c.pauseTimer,
          resetTimer: c.resetTimer,
          timeUp: c.timeUp,
          oven: c.oven,
          screenOn: c.screenOn,
          doneTitle: c.doneTitle,
          doneText: c.doneText,
          notes: c.notes,
          notesSave: c.notesSave,
          notesSaved: c.notesSaved,
          notesError: c.notesError,
          notesSignIn: c.notesSignIn,
          notesPlaceholder: dict.recipeTools.notesPlaceholder,
          backToRecipe: c.backToRecipe,
          again: c.again,
          keys: c.keys,
        }}
      />
    </div>
  );
}

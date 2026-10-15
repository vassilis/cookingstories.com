// Loads the house recipe collection (data/seed) into the database. Safe to run more than once:
// recipes are matched by slug and their translations are replaced.
//
//   DATABASE_URL=... node scripts/seed.mjs
import postgres from "postgres";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const seedDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "seed");
const recipes = JSON.parse(readFileSync(join(seedDir, "recipes.json"), "utf8"));

// data/seed/translations/<locale>.json: { [slug]: { title, description, ingredients, steps } }
const translationsDir = join(seedDir, "translations");
const extra = existsSync(translationsDir)
  ? readdirSync(translationsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(translationsDir, f), "utf8"))])
  : [];

const sql = postgres(url, { max: 1 });

try {
  await sql.begin(async (tx) => {
    for (const r of recipes) {
      const [{ id }] = await tx`
        insert into recipes (slug, category, country, needs_oven, original_locale,
                             visibility, review_status, published_at)
        values (${r.slug}, ${r.category}, ${r.country}, ${r.needsOven}, ${r.originalLocale},
                'public', 'approved', now())
        on conflict (slug) do update set
          category = excluded.category,
          country = excluded.country,
          needs_oven = excluded.needs_oven,
          original_locale = excluded.original_locale,
          updated_at = now()
        returning id`;

      const content = { ...r.translations };
      for (const [locale, bySlug] of extra) {
        if (bySlug[r.slug] && !content[locale]) content[locale] = bySlug[r.slug];
      }

      for (const [locale, t] of Object.entries(content)) {
        const machineTranslated = locale !== r.originalLocale;
        await tx`
          insert into recipe_translations (recipe_id, locale, title, description, ingredients, steps, machine_translated)
          values (${id}, ${locale}, ${t.title}, ${t.description}, ${tx.json(t.ingredients)}, ${tx.json(t.steps)}, ${machineTranslated})
          on conflict (recipe_id, locale) do update set
            title = excluded.title,
            description = excluded.description,
            ingredients = excluded.ingredients,
            steps = excluded.steps,
            machine_translated = excluded.machine_translated,
            updated_at = now()`;
      }
    }
  });
  const locales = ["el", ...extra.map(([l]) => l)].join(", ");
  console.log(`Seeded ${recipes.length} recipes (${locales})`);
} finally {
  await sql.end();
}

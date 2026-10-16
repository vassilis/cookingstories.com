/**
 * One-off conversion of the 2013 MongoDB export (data/legacy/recipes.json)
 * into the seed format used by scripts/seed.ts (data/seed/recipes.json).
 *
 * Run with: pnpm tsx scripts/migrate-legacy.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Category, SeedRecipe } from "../src/db/seed-types";
import { clean, groupIngredients } from "../src/lib/legacy-format";

type LegacyRecipe = {
  slugs: string[];
  title: { el: string };
  description?: { el?: string | null } | null;
  ingredients: { el: string[] };
  steps: { el: string[] };
};

const root = join(import.meta.dirname, "..");
const legacy: LegacyRecipe[] = JSON.parse(
  readFileSync(join(root, "data/legacy/recipes.json"), "utf8"),
);

// Grouping agreed during the design phase.
const categories: Record<Category, string[]> = {
  starters: [
    "droseri-kotosalata", "tonosalata-riziou", "kokkines-pipergies-sto-fourno", "eliokeftedakia",
    "mpiftekia-lahanikon", "polixromi-omeleta", "xortosoupa-me-avgolemono", "spanaki-sto-fourno",
  ],
  pasta: [
    "karmponara", "tortellinia-me-parmezana-kai-krema-galaktos", "saltsa-me-kima",
    "risoto-me-manitaria-champignon", "risoto-me-safran", "italiko-pastitsio-me-tiria-kai-manitaria",
    "penes-me-kapnisto-solomo", "penes-me-kolokitha-kai-xoriatiko-loukaniko",
    "penes-me-kolokithakia-kai-karota-ston-fourno", "zimarika-me-kotopoulo-kai-kokkino-laxano",
    "kokkinistes-soupies-me-kofto-makaronaki", "xulopites-me-manitaria-kai-anthotiro",
  ],
  mains: [
    "mpakaliaros-me-ntomatinia-kai-elies", "fileta-kotopoulou-pane",
    "kotopoulo-se-saltsa-gkorgkotzolas-me-gnocchi", "mprizoles-sto-alouminoxarto",
    "xoirines-mprizoles-me-kremmudia-kai-rizi", "prasina-fasolakia-me-tono",
  ],
  pies: [
    "tiropita-tis-stigmis", "manitaropita", "tarta-me-tiria-kai-kremmidia", "almires-krepes-fantasia",
    "zimi-gia-krepes", "zimi-gia-vasi-pitsas",
  ],
  desserts: [
    "keik-portokaliou-me-glaso-portokali", "keik-me-marmelada-fraoula", "zesti-milopita",
    "sfoliatakia-me-krema-kai-milo", "tiramisou", "cheesecake-rodakino", "soufledakia-sokolatas",
    "muffin-me-kardia-sokolatas", "muffin-me-indokarido-kai-glaso-sokolatas",
    "tragana-mpiskota-me-stagones-sokolatas", "krepes-me-sokolata-kai-maskarpone", "tiganites-mpananes",
  ],
};

// Country each dish comes from. Where the dish has no clear foreign origin it is tagged as
// Greek, since the collection is Greek home cooking. Review the judgement calls marked "?".
const countries: Record<string, string> = {
  // Salads & starters
  "droseri-kotosalata": "GR",
  "tonosalata-riziou": "GR",
  "kokkines-pipergies-sto-fourno": "GR",
  eliokeftedakia: "GR",
  "mpiftekia-lahanikon": "GR",
  "polixromi-omeleta": "GR",
  "xortosoupa-me-avgolemono": "GR",
  "spanaki-sto-fourno": "GR",
  // Pasta & risotto
  karmponara: "IT",
  "tortellinia-me-parmezana-kai-krema-galaktos": "IT",
  "saltsa-me-kima": "GR", // ? Greek "makaronia me kima" rather than Italian ragu
  "risoto-me-manitaria-champignon": "IT",
  "risoto-me-safran": "IT",
  "italiko-pastitsio-me-tiria-kai-manitaria": "IT",
  "penes-me-kapnisto-solomo": "IT", // ? penne al salmone
  "penes-me-kolokitha-kai-xoriatiko-loukaniko": "IT", // ? pasta zucca e salsiccia
  "penes-me-kolokithakia-kai-karota-ston-fourno": "GR",
  "zimarika-me-kotopoulo-kai-kokkino-laxano": "GR",
  "kokkinistes-soupies-me-kofto-makaronaki": "GR",
  "xulopites-me-manitaria-kai-anthotiro": "GR",
  // Mains
  "mpakaliaros-me-ntomatinia-kai-elies": "GR",
  "fileta-kotopoulou-pane": "GR",
  "kotopoulo-se-saltsa-gkorgkotzolas-me-gnocchi": "IT",
  "mprizoles-sto-alouminoxarto": "GR",
  "xoirines-mprizoles-me-kremmudia-kai-rizi": "GR",
  "prasina-fasolakia-me-tono": "GR",
  // Pies & doughs
  "tiropita-tis-stigmis": "GR",
  manitaropita: "GR",
  "tarta-me-tiria-kai-kremmidia": "FR", // ? quiche-style tart
  "almires-krepes-fantasia": "FR",
  "zimi-gia-krepes": "FR",
  "zimi-gia-vasi-pitsas": "IT",
  // Desserts
  "keik-portokaliou-me-glaso-portokali": "GR",
  "keik-me-marmelada-fraoula": "GR",
  "zesti-milopita": "GR",
  "sfoliatakia-me-krema-kai-milo": "GR",
  tiramisou: "IT",
  "cheesecake-rodakino": "US", // ? baked-cheesecake style
  "soufledakia-sokolatas": "FR",
  "muffin-me-kardia-sokolatas": "US",
  "muffin-me-indokarido-kai-glaso-sokolatas": "US",
  "tragana-mpiskota-me-stagones-sokolatas": "US",
  "krepes-me-sokolata-kai-maskarpone": "FR",
  "tiganites-mpananes": "GR",
};

const categoryOf = (slug: string) =>
  (Object.keys(categories) as Category[]).find((c) => categories[c].includes(slug));

const out: SeedRecipe[] = legacy.map((r) => {
  const slug = r.slugs[0];
  const category = categoryOf(slug);
  if (!category) throw new Error(`No category for ${slug}`);
  const steps = r.steps.el.map(clean).filter(Boolean);
  return {
    slug,
    category,
    country: countries[slug] ?? null,
    needsOven: steps.some((s) => /φούρνο/i.test(s)),
    originalLocale: "el",
    translations: {
      el: {
        title: clean(r.title.el),
        description: clean(r.description?.el ?? "") || null,
        ingredients: groupIngredients(r.ingredients.el),
        steps,
      },
    },
  };
});

// Keep the order of the design: by category, then as listed above.
const order = Object.values(categories).flat();
out.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

mkdirSync(join(root, "data/seed"), { recursive: true });
writeFileSync(join(root, "data/seed/recipes.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} recipes to data/seed/recipes.json`);

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { CATEGORIES, type IngredientGroup } from "./seed-types";

export const visibility = pgEnum("visibility", ["private", "link", "public"]);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const category = pgEnum("category", CATEGORIES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    /** Null for the original house collection. */
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    category: category("category").notNull(),
    /** ISO 3166-1 alpha-2, e.g. "GR". */
    country: text("country"),
    region: text("region"),
    needsOven: boolean("needs_oven").notNull().default(false),
    totalMinutes: integer("total_minutes"),
    servings: integer("servings"),
    /** Language the author wrote the recipe in. */
    originalLocale: text("original_locale").notNull(),
    /** Who can read it: only the author, anyone with the share link, or everyone. */
    visibility: visibility("visibility").notNull().default("private"),
    /** Public recipes appear in listings only once approved. */
    reviewStatus: reviewStatus("review_status").notNull().default("pending"),
    shareToken: text("share_token").unique(),
    /** Object key of the cover photo in R2. */
    coverImageKey: text("cover_image_key"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("recipes_listing_idx").on(t.visibility, t.reviewStatus, t.category),
    index("recipes_author_idx").on(t.authorId),
  ],
);

export const recipeTranslations = pgTable(
  "recipe_translations",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** The story behind the dish, written by the author. */
    story: text("story"),
    ingredients: jsonb("ingredients").$type<IngredientGroup[]>().notNull(),
    steps: jsonb("steps").$type<string[]>().notNull(),
    /** True when this text was translated by a machine rather than written by the author. */
    machineTranslated: boolean("machine_translated").notNull().default(false),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.locale] })],
);

export type Recipe = typeof recipes.$inferSelect;
export type RecipeTranslation = typeof recipeTranslations.$inferSelect;

/** A reader's saved recipes. */
export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);

/** Notes in the margin: one private note per reader per recipe, never shown to anyone else. */
export const recipeNotes = pgTable(
  "recipe_notes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);

export type RecipeNote = typeof recipeNotes.$inferSelect;

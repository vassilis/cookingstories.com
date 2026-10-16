export const CATEGORIES = ["starters", "pasta", "mains", "pies", "desserts"] as const;
export type Category = (typeof CATEGORIES)[number];

export type IngredientGroup = {
  /** Section heading such as "For the glaze", or null for the main list. */
  title: string | null;
  items: string[];
};

export type RecipeContent = {
  title: string;
  description: string | null;
  ingredients: IngredientGroup[];
  steps: string[];
};

export type SeedRecipe = {
  slug: string;
  category: Category;
  /** ISO 3166-1 alpha-2 code, or null when the origin is unclear. */
  country: string | null;
  needsOven: boolean;
  originalLocale: string;
  translations: Record<string, RecipeContent>;
};

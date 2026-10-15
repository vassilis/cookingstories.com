/** What the Contents chips can narrow down by. Null or false means "any". */
export type ContentsFilterState = {
  category: string | null;
  country: string | null;
  noOven: boolean;
};

export type FilterableRecipe = {
  category: string;
  country: string | null;
  needsOven: boolean;
};

/** Reads the filter from the URL: ?category=pasta&country=IT&oven=no */
export function filterFromParams(params: { get(name: string): string | null }): ContentsFilterState {
  return {
    category: params.get("category") || null,
    country: params.get("country") || null,
    noOven: params.get("oven") === "no",
  };
}

export const isFiltering = (f: ContentsFilterState) => Boolean(f.category || f.country || f.noOven);

/** All active filters must match (category AND country AND no oven). */
export function matchesFilter(f: ContentsFilterState, recipe: FilterableRecipe): boolean {
  return (
    (!f.category || recipe.category === f.category) &&
    (!f.country || recipe.country === f.country) &&
    (!f.noOven || !recipe.needsOven)
  );
}

/** Number of filters switched on, shown on the Filters button. */
export const activeFilterCount = (f: ContentsFilterState) =>
  [f.category, f.country, f.noOven || null].filter(Boolean).length;

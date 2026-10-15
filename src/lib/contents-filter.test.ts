import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  filterFromParams,
  isFiltering,
  matchesFilter,
  type ContentsFilterState,
  type FilterableRecipe,
} from "./contents-filter";

const none: ContentsFilterState = { category: null, country: null, noOven: false };

const pastaItaly: FilterableRecipe = { category: "pasta", country: "IT", needsOven: false };
const bakedPie: FilterableRecipe = { category: "pies", country: "GR", needsOven: true };
const noCountry: FilterableRecipe = { category: "mains", country: null, needsOven: false };

describe("filterFromParams", () => {
  it("reads category, country and oven=no", () => {
    const f = filterFromParams(new URLSearchParams("category=pasta&country=IT&oven=no"));
    expect(f).toEqual({ category: "pasta", country: "IT", noOven: true });
  });

  it("returns no filter for empty params", () => {
    expect(filterFromParams(new URLSearchParams(""))).toEqual(none);
  });

  it("treats empty strings as no filter", () => {
    const f = filterFromParams(new URLSearchParams("category=&country=&oven="));
    expect(f).toEqual(none);
  });

  it("only treats oven=no as noOven", () => {
    expect(filterFromParams(new URLSearchParams("oven=yes")).noOven).toBe(false);
    expect(filterFromParams(new URLSearchParams("oven=1")).noOven).toBe(false);
    expect(filterFromParams(new URLSearchParams("oven=no")).noOven).toBe(true);
  });
});

describe("isFiltering", () => {
  it("is false with no filters", () => {
    expect(isFiltering(none)).toBe(false);
  });

  it("is true for each filter alone", () => {
    expect(isFiltering({ ...none, category: "pasta" })).toBe(true);
    expect(isFiltering({ ...none, country: "IT" })).toBe(true);
    expect(isFiltering({ ...none, noOven: true })).toBe(true);
  });
});

describe("matchesFilter", () => {
  it("matches everything when no filter is set", () => {
    expect(matchesFilter(none, pastaItaly)).toBe(true);
    expect(matchesFilter(none, bakedPie)).toBe(true);
    expect(matchesFilter(none, noCountry)).toBe(true);
  });

  it("filters by category alone", () => {
    const f = { ...none, category: "pasta" };
    expect(matchesFilter(f, pastaItaly)).toBe(true);
    expect(matchesFilter(f, bakedPie)).toBe(false);
  });

  it("filters by country alone", () => {
    const f = { ...none, country: "GR" };
    expect(matchesFilter(f, bakedPie)).toBe(true);
    expect(matchesFilter(f, pastaItaly)).toBe(false);
  });

  it("never matches a null country when filtering by country", () => {
    expect(matchesFilter({ ...none, country: "IT" }, noCountry)).toBe(false);
  });

  it("noOven excludes recipes that need an oven", () => {
    const f = { ...none, noOven: true };
    expect(matchesFilter(f, pastaItaly)).toBe(true);
    expect(matchesFilter(f, bakedPie)).toBe(false);
  });

  it("combines filters with AND", () => {
    const f: ContentsFilterState = { category: "pasta", country: "IT", noOven: true };
    expect(matchesFilter(f, pastaItaly)).toBe(true);
    expect(matchesFilter({ ...f, category: "pies" }, pastaItaly)).toBe(false);
    expect(matchesFilter({ ...f, country: "GR" }, pastaItaly)).toBe(false);
    expect(matchesFilter(f, { ...pastaItaly, needsOven: true })).toBe(false);
  });
});

describe("activeFilterCount", () => {
  it("is 0 with no filters", () => {
    expect(activeFilterCount(none)).toBe(0);
  });

  it("counts each active filter", () => {
    expect(activeFilterCount({ ...none, category: "pasta" })).toBe(1);
    expect(activeFilterCount({ ...none, category: "pasta", noOven: true })).toBe(2);
    expect(activeFilterCount({ category: "pasta", country: "IT", noOven: true })).toBe(3);
  });
});

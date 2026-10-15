import type { IngredientGroup } from "@/db/seed-types";

/* Helpers for converting the 2013 MongoDB export (see scripts/migrate-legacy.ts). */

/** Collapses runs of whitespace, including the stray newlines in the old data. */
export const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The old data marks section headings inside the ingredient list with a leading "---",
 * e.g. "---Για το γλάσο:". Turns that flat list into groups.
 */
export function groupIngredients(lines: string[]): IngredientGroup[] {
  const groups: IngredientGroup[] = [];
  let current: IngredientGroup = { title: null, items: [] };
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    if (line.startsWith("---")) {
      if (current.items.length || current.title) groups.push(current);
      current = { title: clean(line.replace(/^-+/, "").replace(/:$/, "")), items: [] };
    } else {
      current.items.push(line);
    }
  }
  if (current.items.length || current.title) groups.push(current);
  return groups;
}

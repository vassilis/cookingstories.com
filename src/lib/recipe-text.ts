import type { IngredientGroup } from "@/db/seed-types";

/*
 * Plain-text editing format for ingredients and steps, so the admin editor is a pair of
 * textareas rather than a dynamic form:
 *
 *   ingredients: one per line; a line starting with "#" starts a section
 *   steps: one per line
 */

export function ingredientsToText(groups: IngredientGroup[]): string {
  return groups
    .map((g) => [g.title ? `# ${g.title}` : null, ...g.items].filter((l) => l !== null).join("\n"))
    .join("\n\n");
}

export function textToIngredients(text: string): IngredientGroup[] {
  const groups: IngredientGroup[] = [];
  let current: IngredientGroup = { title: null, items: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      if (current.title || current.items.length) groups.push(current);
      current = { title: line.replace(/^#+\s*/, "") || null, items: [] };
    } else {
      current.items.push(line);
    }
  }
  if (current.title || current.items.length) groups.push(current);
  return groups;
}

export const stepsToText = (steps: string[]) => steps.join("\n");

export const textToSteps = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

import { describe, expect, it } from "vitest";
import type { IngredientGroup } from "@/db/seed-types";
import { ingredientsToText, stepsToText, textToIngredients, textToSteps } from "./recipe-text";

describe("ingredients round trip", () => {
  const roundTrip = (groups: IngredientGroup[]) => textToIngredients(ingredientsToText(groups));

  it("keeps a single untitled group", () => {
    const groups = [{ title: null, items: ["2 eggs", "100 g flour"] }];
    expect(roundTrip(groups)).toEqual(groups);
  });

  it("keeps a single titled group", () => {
    const groups = [{ title: "For the glaze", items: ["1 cup sugar"] }];
    expect(roundTrip(groups)).toEqual(groups);
  });

  it("keeps multiple sections, with and without titles", () => {
    const groups = [
      { title: null, items: ["salt", "pepper"] },
      { title: "For the sauce", items: ["tomatoes", "basil"] },
      { title: "To serve", items: ["parmesan"] },
    ];
    expect(roundTrip(groups)).toEqual(groups);
  });

  it("keeps unicode text such as Greek and fractions", () => {
    const groups = [
      { title: null, items: ["½ φλιτζάνι ζάχαρη", "2 αυγά"] },
      { title: "Για το γλάσο", items: ["¾ κ.σ. βούτυρο"] },
    ];
    expect(roundTrip(groups)).toEqual(groups);
  });

  it("keeps a titled section with no items", () => {
    const groups = [
      { title: "Empty", items: [] },
      { title: "Full", items: ["a"] },
    ];
    expect(roundTrip(groups)).toEqual(groups);
  });

  it("writes titles as '# Title' lines separated by a blank line", () => {
    const text = ingredientsToText([
      { title: null, items: ["a"] },
      { title: "B", items: ["b"] },
    ]);
    expect(text).toBe("a\n\n# B\nb");
  });

  it("returns an empty string for no groups", () => {
    expect(ingredientsToText([])).toBe("");
  });
});

describe("textToIngredients", () => {
  it("ignores blank lines", () => {
    expect(textToIngredients("a\n\n\n   \nb\n")).toEqual([{ title: null, items: ["a", "b"] }]);
  });

  it("trims whitespace around lines", () => {
    expect(textToIngredients("   a  \n\t# Title \t\n  b ")).toEqual([
      { title: null, items: ["a"] },
      { title: "Title", items: ["b"] },
    ]);
  });

  it("starts a section on '# Title'", () => {
    expect(textToIngredients("# Sauce\nx")).toEqual([{ title: "Sauce", items: ["x"] }]);
  });

  it("starts a section on '#Title' without a space", () => {
    expect(textToIngredients("#Sauce\nx")).toEqual([{ title: "Sauce", items: ["x"] }]);
  });

  it("starts a section on '## Title'", () => {
    expect(textToIngredients("## Sauce\nx")).toEqual([{ title: "Sauce", items: ["x"] }]);
  });

  it("gives a '#' line with no text a null title", () => {
    expect(textToIngredients("a\n#\nb")).toEqual([
      { title: null, items: ["a"] },
      { title: null, items: ["b"] },
    ]);
  });

  it("puts items before the first '#' in a group with a null title", () => {
    expect(textToIngredients("a\nb\n# Sauce\nc")).toEqual([
      { title: null, items: ["a", "b"] },
      { title: "Sauce", items: ["c"] },
    ]);
  });

  it("keeps a section that has a title but no items", () => {
    expect(textToIngredients("# One\n# Two\nx")).toEqual([
      { title: "One", items: [] },
      { title: "Two", items: ["x"] },
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(textToIngredients("a\r\n# B\r\nb\r\n")).toEqual([
      { title: null, items: ["a"] },
      { title: "B", items: ["b"] },
    ]);
  });

  it("returns no groups for empty or blank text", () => {
    expect(textToIngredients("")).toEqual([]);
    expect(textToIngredients("  \n \n")).toEqual([]);
  });
});

describe("steps", () => {
  it("round-trips", () => {
    const steps = ["Mix the flour.", "Βάλτε στο φούρνο.", "Serve with ½ lemon."];
    expect(textToSteps(stepsToText(steps))).toEqual(steps);
  });

  it("joins steps with newlines", () => {
    expect(stepsToText(["a", "b"])).toBe("a\nb");
  });

  it("handles CRLF line endings", () => {
    expect(textToSteps("one\r\ntwo\r\nthree")).toEqual(["one", "two", "three"]);
  });

  it("drops blank lines and trims whitespace", () => {
    expect(textToSteps("  one \n\n   \n two\n")).toEqual(["one", "two"]);
  });

  it("returns an empty list for empty text", () => {
    expect(textToSteps("")).toEqual([]);
  });
});

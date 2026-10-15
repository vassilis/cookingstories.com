import { describe, expect, it } from "vitest";
import { clean, groupIngredients } from "./legacy-format";

describe("clean", () => {
  it("collapses runs of spaces", () => {
    expect(clean("a    b")).toBe("a b");
  });

  it("collapses newlines and tabs into single spaces", () => {
    expect(clean("a\n\nb\t\tc\r\nd")).toBe("a b c d");
  });

  it("trims the ends", () => {
    expect(clean("  \n hello \n ")).toBe("hello");
  });

  it("returns an empty string for whitespace only", () => {
    expect(clean(" \n\t ")).toBe("");
  });
});

describe("groupIngredients", () => {
  it("returns no groups for an empty list", () => {
    expect(groupIngredients([])).toEqual([]);
  });

  it("keeps a plain list as one untitled group", () => {
    expect(groupIngredients(["2 αυγά", "1 κούπα ζάχαρη"])).toEqual([
      { title: null, items: ["2 αυγά", "1 κούπα ζάχαρη"] },
    ]);
  });

  it("turns '---' lines into titled groups and strips the trailing colon", () => {
    expect(groupIngredients(["2 αυγά", "---Για το γλάσο:", "1 κούπα ζάχαρη", "βούτυρο"])).toEqual([
      { title: null, items: ["2 αυγά"] },
      { title: "Για το γλάσο", items: ["1 κούπα ζάχαρη", "βούτυρο"] },
    ]);
  });

  it("handles several headings", () => {
    expect(groupIngredients(["a", "---One:", "b", "---Two:", "c"])).toEqual([
      { title: null, items: ["a"] },
      { title: "One", items: ["b"] },
      { title: "Two", items: ["c"] },
    ]);
  });

  it("handles a list that starts with a heading, with no empty untitled group", () => {
    expect(groupIngredients(["---Για τη ζύμη:", "αλεύρι"])).toEqual([
      { title: "Για τη ζύμη", items: ["αλεύρι"] },
    ]);
  });

  it("skips empty and whitespace-only lines", () => {
    expect(groupIngredients(["", "a", "  \n ", "b"])).toEqual([{ title: null, items: ["a", "b"] }]);
  });

  it("cleans whitespace inside lines and headings", () => {
    expect(groupIngredients(["  2   αυγά\n", "---  Για   το γλάσο :"])).toEqual([
      { title: null, items: ["2 αυγά"] },
      { title: "Για το γλάσο", items: [] },
    ]);
  });

  it("strips extra dashes from the heading", () => {
    expect(groupIngredients(["------Sauce:", "x"])).toEqual([{ title: "Sauce", items: ["x"] }]);
  });

  it("keeps a heading that has no items", () => {
    expect(groupIngredients(["---Empty:"])).toEqual([{ title: "Empty", items: [] }]);
  });
});

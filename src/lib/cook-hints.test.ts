import { describe, expect, it } from "vitest";
import { findOvenTemperature, findTimer, formatClock } from "./cook-hints";

describe("findTimer with numbers", () => {
  it("reads minutes in English", () => {
    expect(findTimer("Bake for about 50 minutes")).toEqual({ minutes: 50 });
  });

  it("reads minutes in Greek", () => {
    expect(findTimer("Ψήνουμε για 50 λεπτά περίπου")).toEqual({ minutes: 50 });
  });

  it("reads the short form 'mins'", () => {
    expect(findTimer("Simmer for 10 mins")).toEqual({ minutes: 10 });
  });

  it("converts a single hour in Greek", () => {
    expect(findTimer("Ψήνουμε 1 ώρα")).toEqual({ minutes: 60 });
  });

  it("takes the lower bound of an English range", () => {
    expect(findTimer("Cook for 3-4 hours")).toEqual({ minutes: 180 });
  });

  it("takes the lower bound of a Greek range with an en dash", () => {
    expect(findTimer("Μαγειρεύουμε για 3–4 ώρες")).toEqual({ minutes: 180 });
  });
});

describe("findTimer with words", () => {
  it.each([
    ["Bake for an hour and a half", 90],
    ["Ψήνουμε μιάμιση ώρα", 90],
    ["Rest for half an hour", 30],
    ["Ψήνουμε μισή ώρα", 30],
    ["Bake for another hour", 60],
    ["Ψήνουμε καμιά ώρα", 60],
    ["Ψήνουμε καμιά ωρίτσα", 60],
    ["Stir for half a minute", 0.5],
    ["Ανακατεύουμε μισό λεπτό", 0.5],
    ["Cook for another minute", 1],
    ["Ανακατεύουμε κανένα λεπτό", 1],
  ])("reads %j as %d minutes", (step, minutes) => {
    expect(findTimer(step)).toEqual({ minutes });
  });

  it("returns null when the step has no time", () => {
    expect(findTimer("Mix the flour and the eggs until smooth")).toBeNull();
  });
});

describe("findTimer back-references", () => {
  it("skips a back-reference and uses the new timer in English", () => {
    expect(findTimer("After 50 minutes, take the cake out and let it cool for 5 minutes")).toEqual({ minutes: 5 });
  });

  it("skips a back-reference and uses the new timer in Greek", () => {
    expect(findTimer("Αφού περάσουν τα 50 λεπτά, βγάζουμε το κέικ και το αφήνουμε να κρυώσει 5 λεπτά")).toEqual({
      minutes: 5,
    });
  });

  it("returns null when the step only refers back", () => {
    expect(findTimer("After 50 minutes, take it out.")).toBeNull();
  });
});

describe("findOvenTemperature", () => {
  it("reads degrees Celsius", () => {
    expect(findOvenTemperature("Preheat the oven to 180°C")).toBe("180°C");
  });

  it("reads Greek degrees", () => {
    expect(findOvenTemperature("Ψήνουμε στους 180 βαθμούς")).toBe("180°C");
  });

  it("adds C when only the degree sign is written", () => {
    expect(findOvenTemperature("Bake at 200° for 1 hour")).toBe("200°C");
  });

  it("returns null when there is no temperature", () => {
    expect(findOvenTemperature("Mix everything well")).toBeNull();
  });

  it("ignores a four digit number without a degree sign", () => {
    expect(findOvenTemperature("Add 1000 g of flour")).toBeNull();
  });
});

describe("formatClock", () => {
  it("formats zero", () => {
    expect(formatClock(0)).toBe("00:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatClock(125)).toBe("02:05");
  });

  it("adds hours when needed", () => {
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("rounds fractional seconds", () => {
    expect(formatClock(59.6)).toBe("01:00");
  });

  it("clamps negative values to zero", () => {
    expect(formatClock(-30)).toBe("00:00");
  });
});

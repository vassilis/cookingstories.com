/*
 * Reads a recipe step for things cook mode can help with: a timer ("bake for 50 minutes",
 * "ψήνουμε 50 λεπτά") and an oven temperature ("180°C", "180 βαθμούς"). English and Greek.
 */

/** Minutes, possibly fractional ("half a minute" is 0.5). */
export type StepTimer = { minutes: number };

const NUMBER_UNIT =
  /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(minutes?|mins?\b|min\b|λεπτ[άαώο]*|hours?|hrs?\b|ώρ[αεςών]+|ωρ[ίι]τσα)/gi;

// Words that mean a fixed amount of time without a number. Checked in order, longest first.
const WORD_TIMES: [RegExp, number][] = [
  [/(an|one) hour and a half|one and a half hours|μιάμιση ώρα/i, 90],
  [/half an hour|μισή ώρα/i, 30],
  [/(an|one|another) hour|(μια|μία|άλλη μία|άλλη μια|καμιά) ώρα|ωρίτσα/i, 60],
  [/half a minute|μισό λεπτό/i, 0.5],
  [/(a|one|another) minute|(κανένα|ένα) λεπτό/i, 1],
];

// "After 50 minutes, take it out" refers back to an earlier timer, so it isn't a new one.
const REFERS_BACK = /(after|αφού περάσουν|αφού|μετά από|μετά)\s+(the\s+|τα\s+|τις\s+)?(about\s+|περίπου\s+)?$/i;

const isHours = (unit: string) => /^(hours?|hrs?|ώρ|ωρ)/i.test(unit);

export function findTimer(step: string): StepTimer | null {
  const found: { minutes: number; refersBack: boolean }[] = [];
  for (const m of step.matchAll(NUMBER_UNIT)) {
    const value = Number(m[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    const minutes = Math.round(isHours(m[2]) ? value * 60 : value);
    const before = step.slice(Math.max(0, (m.index ?? 0) - 30), m.index);
    found.push({ minutes, refersBack: REFERS_BACK.test(before) });
  }
  const pick = found.find((f) => !f.refersBack) ?? null;
  if (pick) return { minutes: pick.minutes };
  if (found.length > 0) return null; // only back-references, e.g. "After 50 minutes"

  for (const [pattern, minutes] of WORD_TIMES) {
    if (pattern.test(step)) return { minutes };
  }
  return null;
}

const OVEN = /(\d{2,3})\s*(?:°\s*C|°|βαθμ)/i;

/** "Preheat the oven to 180°C" -> "180°C". */
export function findOvenTemperature(step: string): string | null {
  const m = step.match(OVEN);
  return m ? `${m[1]}°C` : null;
}

/** 125 -> "02:05", 3725 -> "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RecipeNotes } from "@/components/recipe-notes";
import type { IngredientGroup } from "@/db/seed-types";
import { findOvenTemperature, findTimer, formatClock } from "@/lib/cook-hints";
import { IngredientChecklist } from "../../../../(site)/recipes/[slug]/ingredient-checklist";
import styles from "./cook.module.css";

type Labels = {
  close: string;
  ingredients: string;
  checked: string;
  start: string;
  stepCount: string;
  step: string;
  back: string;
  next: string;
  finish: string;
  timer: string;
  startTimer: string;
  pauseTimer: string;
  resetTimer: string;
  timeUp: string;
  oven: string;
  screenOn: string;
  doneTitle: string;
  doneText: string;
  notes: string;
  notesSave: string;
  notesSaved: string;
  notesError: string;
  notesSignIn: string;
  notesPlaceholder: string;
  backToRecipe: string;
  again: string;
  keys: string;
};

type Timer = { total: number; left: number; endsAt: number | null; rang: boolean };

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/**
 * Step-by-step cooking in its own tab: ingredients first, then one step at a time with big
 * type, timers found in the step text (they keep running while you move on), and the
 * screen kept awake where the browser allows it.
 */
export function CookAssistant({
  title,
  slug,
  groups,
  steps,
  recipeHref,
  labels,
  note,
}: {
  title: string;
  slug: string;
  groups: IngredientGroup[];
  steps: string[];
  recipeHref: string;
  labels: Labels;
  note: { initial: string; save: (body: string) => Promise<void> } | null;
}) {
  const [screen, setScreen] = useState<"prep" | "cook" | "done">("prep");
  const [index, setIndex] = useState(0);
  const [timers, setTimers] = useState<Record<number, Timer>>({});
  const [now, setNow] = useState(0);
  const [awake, setAwake] = useState(false);

  const hints = useMemo(
    () => steps.map((s) => ({ timer: findTimer(s), oven: findOvenTemperature(s) })),
    [steps],
  );

  const timerFor = (i: number): Timer | null => {
    if (timers[i]) return timers[i];
    const hint = hints[i]?.timer;
    if (!hint) return null;
    const total = Math.round(hint.minutes * 60);
    return { total, left: total, endsAt: null, rang: false };
  };
  const remaining = (t: Timer) => (t.endsAt ? Math.max(0, (t.endsAt - now) / 1000) : t.left);
  const running = Object.entries(timers).filter(([, t]) => t.endsAt !== null);
  const anyRunning = running.length > 0;
  // Shown in the strip at the top: running timers, and finished ones until they're reset.
  const active = Object.entries(timers).filter(([, t]) => t.endsAt !== null || t.rang);

  // The interval reads the latest timers through a ref, so it doesn't restart every tick.
  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // Tick while any timer runs, and ring when one reaches zero.
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const due = Object.entries(timersRef.current).filter(([, x]) => x.endsAt !== null && x.endsAt <= t);
      if (due.length === 0) return;
      ring();
      setTimers((all) => {
        const next = { ...all };
        for (const [k] of due) next[Number(k)] = { ...all[Number(k)], endsAt: null, left: 0, rang: true };
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Keep the screen on while cooking, where the browser supports it.
  useEffect(() => {
    if (screen !== "cook" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (!cancelled) setAwake(true);
      } catch {
        if (!cancelled) setAwake(false);
      }
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [screen]);

  // Arrow keys move between steps.
  useEffect(() => {
    if (screen !== "cook") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, steps.length]);

  const startTimer = (i: number) => {
    const t = timerFor(i);
    if (!t || t.left <= 0) return;
    const at = Date.now();
    setNow(at);
    setTimers((all) => ({ ...all, [i]: { ...t, endsAt: at + t.left * 1000, rang: false } }));
  };
  const pauseTimer = (i: number) => {
    const t = timers[i];
    if (!t?.endsAt) return;
    setTimers((all) => ({ ...all, [i]: { ...t, left: Math.max(0, (t.endsAt! - Date.now()) / 1000), endsAt: null } }));
  };
  const resetTimer = (i: number) => {
    const t = timerFor(i);
    if (!t) return;
    setTimers((all) => ({ ...all, [i]: { ...t, left: t.total, endsAt: null, rang: false } }));
  };

  const close = () => {
    window.close();
    // Browsers only close tabs that a link or script opened; otherwise go back to the recipe.
    setTimeout(() => window.location.assign(recipeHref), 150);
  };

  const step = steps[index];
  const hint = hints[index];
  const timer = timerFor(index);
  const last = index === steps.length - 1;

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.logo}>Cooking Stories</span>
        <span className={styles.recipeTitle}>{title}</span>
        <button type="button" className="button button-quiet" onClick={close}>
          {labels.close}
        </button>
      </header>

      {active.length > 0 && (
        <div className={styles.runningStrip} aria-live="polite">
          {active.map(([k, t]) => (
            <button
              key={k}
              type="button"
              className={t.rang ? `${styles.runningTimer} ${styles.rang}` : styles.runningTimer}
              onClick={() => {
                setIndex(Number(k));
                setScreen("cook");
              }}
            >
              {fill(labels.step, { n: Number(k) + 1, total: steps.length })} · {t.rang ? labels.timeUp : formatClock(remaining(t))}
            </button>
          ))}
        </div>
      )}

      {screen === "prep" && (
        <main className={styles.prep}>
          <section className={styles.prepList}>
            <span aria-hidden="true" className={styles.marginLine} />
            <IngredientChecklist slug={slug} groups={groups} title={labels.ingredients} progressTemplate={labels.checked} />
          </section>
          <section className={styles.prepStart}>
            <h1 className={styles.prepTitle}>{title}</h1>
            <p>{fill(labels.stepCount, { count: steps.length })}</p>
            <button type="button" className={`button button-primary ${styles.big}`} onClick={() => { setIndex(0); setScreen("cook"); }}>
              {labels.start}
            </button>
            <small>{labels.keys}</small>
          </section>
        </main>
      )}

      {screen === "cook" && (
        <main className={styles.cook}>
          <div className={styles.progress} aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} className={i <= index ? styles.segmentDone : styles.segment} />
            ))}
          </div>
          <p className={styles.stepLabel}>{fill(labels.step, { n: index + 1, total: steps.length })}</p>

          <div className={styles.stepBody}>
            <span aria-hidden="true" className={styles.stepNumber}>
              {index + 1}
            </span>
            <p className={styles.stepText} aria-live="polite">
              {step}
            </p>
          </div>

          <div className={styles.helpers}>
            {hint?.oven && <span className={styles.chip}>{fill(labels.oven, { temp: hint.oven })}</span>}
            {timer && (
              <div className={styles.timer} data-ringing={timer.rang || undefined}>
                <div>
                  <span className={styles.timerLabel}>{timer.rang ? labels.timeUp : labels.timer}</span>
                  <span className={styles.clock} role="timer">
                    {formatClock(remaining(timer))}
                  </span>
                </div>
                <div className={styles.timerButtons}>
                  {timer.endsAt ? (
                    <button type="button" className="button button-primary" onClick={() => pauseTimer(index)}>
                      {labels.pauseTimer}
                    </button>
                  ) : (
                    <button type="button" className="button button-primary" onClick={() => startTimer(index)} disabled={timer.left <= 0}>
                      {labels.startTimer}
                    </button>
                  )}
                  <button type="button" className="button button-quiet" onClick={() => resetTimer(index)}>
                    {labels.resetTimer}
                  </button>
                </div>
              </div>
            )}
          </div>

          {awake && <p className={styles.awake}>{labels.screenOn}</p>}

          <nav className={styles.nav}>
            <button type="button" className={`button button-quiet ${styles.big}`} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              {labels.back}
            </button>
            <button
              type="button"
              className={`button button-primary ${styles.big}`}
              onClick={() => (last ? setScreen("done") : setIndex((i) => i + 1))}
            >
              {last ? labels.finish : labels.next}
            </button>
          </nav>
        </main>
      )}

      {screen === "done" && (
        <main className={styles.done}>
          <h1 className={styles.doneTitle}>{labels.doneTitle}</h1>
          <p>{fill(labels.doneText, { title })}</p>
          <section className={styles.doneNotes}>
            <h2>{labels.notes}</h2>
            {note ? (
              <RecipeNotes
                initial={note.initial}
                save={note.save}
                labels={{ placeholder: labels.notesPlaceholder, save: labels.notesSave, saved: labels.notesSaved, error: labels.notesError }}
              />
            ) : (
              <p>{labels.notesSignIn}</p>
            )}
          </section>
          <div className={styles.nav}>
            <a href={recipeHref} className={`button button-quiet ${styles.big}`}>
              {labels.backToRecipe}
            </a>
            <button type="button" className={`button button-primary ${styles.big}`} onClick={() => { setIndex(0); setScreen("cook"); }}>
              {labels.again}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

/** Three short beeps and a buzz when a timer ends. Quietly does nothing where unsupported. */
function ring() {
  try {
    navigator.vibrate?.([300, 150, 300]);
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.3);
    });
  } catch {
    // No audio available; the timer still shows "Time's up".
  }
}

"use client";

import { useState, useTransition } from "react";
import { setFavoriteAction } from "./actions";

export function FavoriteButton({
  recipeId,
  initial,
  shareToken,
  labels,
}: {
  recipeId: string;
  initial: boolean;
  shareToken: string | null;
  labels: { save: string; saved: string };
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next); // show the change straight away; undo it if saving fails
    startTransition(async () => {
      try {
        setOn(await setFavoriteAction(recipeId, next, shareToken));
      } catch {
        setOn(!next);
      }
    });
  };

  return (
    <button type="button" className="button button-quiet" aria-pressed={on} onClick={toggle} disabled={pending}>
      <HeartIcon filled={on} />
      {on ? labels.saved : labels.save}
    </button>
  );
}

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "var(--red)" : "none"}
      stroke={filled ? "var(--red)" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

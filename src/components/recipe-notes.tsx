"use client";

import { useState, useTransition } from "react";

type Status = "idle" | "saving" | "saved" | "error";

/** A reader's private note on a recipe. Saves on the button or when the field loses focus. */
export function RecipeNotes({
  initial,
  save,
  labels,
  className,
}: {
  initial: string;
  save: (body: string) => Promise<void>;
  labels: { placeholder: string; save: string; saved: string; error: string };
  className?: string;
}) {
  const [body, setBody] = useState(initial);
  const [lastSaved, setLastSaved] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();

  const persist = () => {
    if (body === lastSaved) return;
    setStatus("saving");
    startTransition(async () => {
      try {
        await save(body);
        setLastSaved(body);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setStatus("idle");
        }}
        onBlur={persist}
        rows={4}
        maxLength={5000}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        style={{
          font: "inherit",
          fontSize: 16,
          lineHeight: "32px",
          padding: "0 14px",
          border: "1px solid var(--line-strong)",
          borderRadius: 8,
          resize: "vertical",
          color: "var(--ink)",
          background: "var(--sheet) var(--ruled)",
        }}
      />
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="button button-quiet"
          onClick={persist}
          disabled={status === "saving" || body === lastSaved}
        >
          {labels.save}
        </button>
        <span role="status" style={{ fontSize: 14, color: "var(--muted)" }}>
          {status === "saved" ? labels.saved : status === "error" ? labels.error : ""}
        </span>
      </span>
    </div>
  );
}

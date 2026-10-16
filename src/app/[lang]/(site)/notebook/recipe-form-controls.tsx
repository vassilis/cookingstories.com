"use client";

import { useState } from "react";
import styles from "./notebook.module.css";

export function CopyLink({ url, labels }: { url: string; labels: { field: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={styles.copyRow}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={labels.field} />
      <button
        type="button"
        className="button button-quiet"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? labels.copied : labels.copy}
      </button>
    </span>
  );
}

/** Two-step delete: the first click asks, the second deletes. No browser dialog. */
export function DeleteRecipe({
  action,
  slug,
  uiLocale,
  labels,
}: {
  action: (formData: FormData) => Promise<void>;
  slug: string;
  uiLocale: string;
  labels: { delete: string; confirm: string; warning: string; cancel: string };
}) {
  const [asking, setAsking] = useState(false);
  return (
    <form action={action} className={styles.delete}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="uiLocale" value={uiLocale} />
      {asking ? (
        <>
          <span>{labels.warning}</span>
          <button type="submit" className={`button ${styles.danger}`}>
            {labels.confirm}
          </button>
          <button type="button" className="button button-quiet" onClick={() => setAsking(false)}>
            {labels.cancel}
          </button>
        </>
      ) : (
        <button type="button" className={`button button-quiet ${styles.dangerQuiet}`} onClick={() => setAsking(true)}>
          {labels.delete}
        </button>
      )}
    </form>
  );
}

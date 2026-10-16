"use client";

import { useEffect, useState } from "react";
import type { IngredientGroup } from "@/db/seed-types";
import styles from "./recipe.module.css";

/** Tick off ingredients while you gather them. Remembered per recipe in this browser. */
export function IngredientChecklist({
  slug,
  groups,
  title,
  progressTemplate,
}: {
  slug: string;
  groups: IngredientGroup[];
  title: string;
  progressTemplate: string;
}) {
  const storageKey = `cs:checked:${slug}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // Restoring from storage after mount keeps server and client HTML identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setChecked(JSON.parse(saved));
    } catch {
      // Storage can be unavailable (private mode); the list still works without it.
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <>
      <div className={styles.ingredientsHead}>
        <h2 id="ingredients-title" className={styles.sectionTitle}>
          {title}
        </h2>
        <span className={styles.progress}>
          {progressTemplate.replace("{done}", String(done)).replace("{total}", String(total))}
        </span>
      </div>
      {groups.map((group, gi) => (
        <div key={gi} className={styles.group}>
          {group.title && <h3 className={styles.groupTitle}>{group.title}</h3>}
          <ul className={styles.items}>
            {group.items.map((item, ii) => {
              const id = `${gi}-${ii}`;
              return (
                <li key={id}>
                  <label className={checked[id] ? `${styles.item} ${styles.itemDone}` : styles.item}>
                    <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)} />
                    <span>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

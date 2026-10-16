"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { activeFilterCount, filterFromParams, isFiltering, matchesFilter } from "@/lib/contents-filter";
import styles from "./home.module.css";

export type ContentsEntry = {
  slug: string;
  href: string;
  title: string;
  number: string;
  country: string | null;
  needsOven: boolean;
};

export type ContentsGroup = {
  category: string;
  label: string;
  recipes: ContentsEntry[];
};

type Option = { value: string; label: string; count: number };

/**
 * The table of contents with category, country and "no oven" chips. Choosing a chip doesn't hide
 * anything: matching recipes stay in place and the rest fade, so the page keeps its shape.
 * The URL (?category=pasta&country=IT&oven=no) is the only state, so other pages can link straight
 * to a filtered view and the back button keeps working.
 */
export function ContentsFilter({
  groups,
  countries,
  labels,
}: {
  groups: ContentsGroup[];
  countries: Option[];
  labels: {
    title: string;
    all: string;
    category: string;
    country: string;
    anyCountry: string;
    kitchen: string;
    noOven: string;
    filters: string;
    matches: string;
  };
}) {
  const filter = filterFromParams(useSearchParams());
  const { category, country, noOven } = filter;

  // Next.js keeps useSearchParams in sync with history.replaceState, without a server round trip.
  const update = (key: "category" | "country" | "oven", value: string | null) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
  };

  const matches = (group: ContentsGroup, r: ContentsEntry) => matchesFilter(filter, { ...r, category: group.category });

  const total = groups.reduce((n, g) => n + g.recipes.length, 0);
  const matching = groups.reduce((n, g) => n + g.recipes.filter((r) => matches(g, r)).length, 0);
  const filtering = isFiltering(filter);
  const noOvenCount = groups.reduce((n, g) => n + g.recipes.filter((r) => !r.needsOven).length, 0);
  const activeCount = activeFilterCount(filter);
  // Closed by default; open when the page is opened on a filtered view (e.g. from a recipe tag).
  const [open, setOpen] = useState(filtering);

  const categories: Option[] = groups.map((g) => ({ value: g.category, label: g.label, count: g.recipes.length }));

  return (
    <>
      <div className={styles.contentsHead}>
        <h2 id="contents-title" className={styles.sectionTitle}>
          {labels.title}
        </h2>
        <div className={styles.contentsTools}>
          <p className={styles.matchCount} aria-live="polite">
            {filtering ? labels.matches.replace("{count}", String(matching)).replace("{total}", String(total)) : ""}
          </p>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="contents-filters"
            className={`${styles.chip} ${open ? styles.chipActive : ""}`}
            onClick={() => setOpen((v) => !v)}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            {labels.filters}
            {activeCount > 0 && <span className={styles.filterBadge}>{activeCount}</span>}
          </button>
        </div>
      </div>

      <div id="contents-filters" className={styles.filters} hidden={!open}>
        <ChipRow
          label={labels.category}
          allLabel={labels.all}
          allCount={total}
          options={categories}
          selected={category}
          onSelect={(value) => update("category", value)}
        />
        <ChipRow
          label={labels.country}
          allLabel={labels.anyCountry}
          allCount={total}
          options={countries}
          selected={country}
          onSelect={(value) => update("country", value)}
        />
        <div role="group" aria-label={labels.kitchen} className={styles.chipRow}>
          <span className={styles.chipRowLabel}>{labels.kitchen}</span>
          <button
            type="button"
            aria-pressed={noOven}
            className={`${styles.chip} ${noOven ? styles.chipActive : ""}`}
            onClick={() => update("oven", noOven ? null : "no")}
          >
            {labels.noOven} <span>{noOvenCount}</span>
          </button>
        </div>
      </div>

      <div className={styles.toc}>
        {groups.map((g) => {
          const groupMatches = g.recipes.some((r) => matches(g, r));
          return (
            <div
              key={g.category}
              id={`cat-${g.category}`}
              className={`${styles.tocGroup} ${filtering && !groupMatches ? styles.dimmed : ""}`}
            >
              <h3 className={styles.tocTitle}>
                {g.label} <span>{g.recipes.length}</span>
              </h3>
              <ol className={styles.tocList}>
                {g.recipes.map((r) => (
                  <li key={r.slug} className={filtering && groupMatches && !matches(g, r) ? styles.dimmed : undefined}>
                    <Link href={r.href} className={styles.tocLink}>
                      <span>{r.title}</span>
                      <span aria-hidden="true" className={styles.leader} />
                      <span className={styles.tocNumber}>{r.number}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ChipRow({
  label,
  allLabel,
  allCount,
  options,
  selected,
  onSelect,
}: {
  label: string;
  allLabel: string;
  allCount: number;
  options: Option[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className={styles.chipRow}>
      <span className={styles.chipRowLabel}>{label}</span>
      <button
        type="button"
        aria-pressed={selected === null}
        className={`${styles.chip} ${selected === null ? styles.chipActive : ""}`}
        onClick={() => onSelect(null)}
      >
        {allLabel} <span>{allCount}</span>
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected === o.value}
          className={`${styles.chip} ${selected === o.value ? styles.chipActive : ""}`}
          onClick={() => onSelect(selected === o.value ? null : o.value)}
        >
          {o.label} <span>{o.count}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="button button-quiet" onClick={() => window.print()}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 9V3h10v6" />
        <rect x="3" y="9" width="18" height="8" rx="1" />
        <path d="M7 14h10v7H7z" />
      </svg>
      {label}
    </button>
  );
}

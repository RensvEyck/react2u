/** Pijltje voor links en knoppen ("Lees meer →"); erft de tekstkleur. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" className={className} aria-hidden="true" focusable="false">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

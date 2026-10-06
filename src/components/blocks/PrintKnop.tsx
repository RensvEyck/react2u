"use client";

export function PrintKnop({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[#312D82] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(49,45,130,.28)] transition-colors hover:bg-[#231F63]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
      </svg>
      {label}
    </button>
  );
}

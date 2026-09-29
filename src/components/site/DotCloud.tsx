import { DOT_R, LOGO_DOTS } from "@/lib/brand";

/**
 * De stippenwolk uit het logo, los van het woordmerk — het beeldmerk dat door
 * de hele site terugkomt (hero, CTA, onderhoudspagina).
 */
export default function DotCloud({
  outline = false, animate = false, className,
}: {
  /** Witte rand om elke stip, voor als de wolk over een foto valt. */
  outline?: boolean;
  /** Stip voor stip laten verschijnen en zweven — uit bij prefers-reduced-motion. */
  animate?: boolean;
  className?: string;
}) {
  // De viewBox sluit strak om de stippen, zodat de wolk zijn hele vlak vult.
  const pad = DOT_R + 1;
  const xs = LOGO_DOTS.map(([, x]) => x);
  const ys = LOGO_DOTS.map(([, , y]) => y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - minX;
  const h = Math.max(...ys) + pad - minY;

  return (
    <svg
      viewBox={`${minX} ${minY} ${w} ${h}`}
      className={`${animate ? "dots-animate " : ""}${className || ""}`}
      aria-hidden="true"
      focusable="false"
    >
      {LOGO_DOTS.map(([fill, cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          className="dot"
          style={{ "--i": i } as React.CSSProperties}
          cx={cx}
          cy={cy}
          r={DOT_R}
          fill={fill}
          {...(outline ? { stroke: "#fff", strokeWidth: 0.9 } : {})}
        />
      ))}
    </svg>
  );
}

/** Pijltje voor "Lees verder →"-links; erft de tekstkleur. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" className={className} aria-hidden="true" focusable="false">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

export default function LogoCarousel({ logos }: { logos: { image: string; alt?: string }[] }) {
  const [offset, setOffset] = useState(0);
  const paused = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) setOffset((o) => o + 1);
    }, 3000);
    return () => clearInterval(t);
  }, []);
  if (!logos?.length) return null;
  const visible = [0, 1, 2, 3].map((i) => logos[(offset + i) % logos.length]);
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 items-center gap-8"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {visible.map((l, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${l.image}-${i}`} src={l.image} alt={l.alt || ""} className="mx-auto max-h-24 w-auto object-contain transition-opacity duration-500" />
      ))}
    </div>
  );
}

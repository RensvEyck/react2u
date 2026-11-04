"use client";
import { useFormStatus } from "react-dom";
import { LuLoaderCircle } from "react-icons/lu";

/**
 * Verzendknop die uit gaat zolang het formulier bezig is, zodat een tweede of
 * derde klik geen dubbele rij aanmaakt (zo ontstonden er drie keer dezelfde partner).
 */
export default function VerzendKnop({ children, className = "abtn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} disabled:opacity-60`} disabled={pending}>
      {pending ? <><LuLoaderCircle className="animate-spin" /> Bezig…</> : children}
    </button>
  );
}

"use client";
import { usePathname } from "next/navigation";
import { TALEN, vertaalPad } from "@/lib/taal";
import { useTaal } from "./Taal";

/*
 * De taalknop NL | EN. Elke taal is een gewone <a>: de Nederlandse en de
 * Engelse site hebben elk een eigen root layout, dus wisselen is toch een
 * volledige paginalading. De link gaat naar dezelfde pagina in de andere taal;
 * zonder vertaling naar het startscherm van die taal (lib/taal.ts).
 */
export default function Taalwissel({ donker = false, className = "" }: { donker?: boolean; className?: string }) {
  const path = usePathname() || "/";
  const { taal, t } = useTaal();
  return (
    <nav aria-label={t.algemeen.taal} className={`flex items-center gap-1 text-[13px] font-bold ${className}`}>
      {TALEN.map((l, i) => {
        const actief = l === taal;
        return (
          <span key={l} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden style={{ color: donker ? "rgba(255,255,255,0.4)" : "#B9B6D6" }}>|</span>}
            <a
              href={vertaalPad(path, l)}
              lang={l}
              hrefLang={l}
              aria-current={actief ? "page" : undefined}
              aria-label={t.algemeen.talen[l]}
              className={`rk-tab rounded-[6px] px-1.5 py-0.5 ${actief ? "underline underline-offset-4" : ""}`}
              style={actief
                ? { color: donker ? "#ffffff" : "#322E83" }
                : { color: donker ? "rgba(255,255,255,0.78)" : "#55518A" }}
            >
              {t.algemeen.talenKort[l]}
            </a>
          </span>
        );
      })}
    </nav>
  );
}

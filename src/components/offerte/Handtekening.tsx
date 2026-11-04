"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Caveat } from "next/font/google";

/*
 * Handtekening voor een offerte: tekenen met muis, vinger of pen, of je naam
 * typen. Beide worden een PNG op een vaste maat (1000 × 300), zodat de
 * database altijd hetzelfde soort bestand krijgt en de grootte begrensd is
 * (migratie 0024 weigert alles boven 300.000 tekens).
 */

const handschrift = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

const B = 1000;
const H = 300;
const INKT = "#1c1a4e";

type Modus = "tekenen" | "typen";

export default function Handtekening({
  naam, onChange, id,
}: {
  /** De naam uit het formulier: de standaard voor "typen". */
  naam: string;
  /** PNG als data-URL, of null als er (nog) niets staat. */
  onChange: (png: string | null) => void;
  id?: string;
}) {
  const [modus, setModus] = useState<Modus>("tekenen");
  const [getypt, setGetypt] = useState<string | null>(null);
  const [leeg, setLeeg] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tekent = useRef(false);
  const punten = useRef<{ x: number; y: number }[]>([]);
  const lengte = useRef(0);

  const tekst = getypt ?? naam;

  const ctx = () => {
    const c = canvas.current?.getContext("2d");
    if (c) {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = INKT;
      c.fillStyle = INKT;
    }
    return c;
  };

  const wis = useCallback(() => {
    ctx()?.clearRect(0, 0, B, H);
    lengte.current = 0;
    setLeeg(true);
    onChange(null);
  }, [onChange]);

  // Getypte naam: in het handschriftlettertype op het doek, opnieuw bij elke letter.
  useEffect(() => {
    if (modus !== "typen") return;
    let weg = false;
    const naamTekenen = async () => {
      const familie = handschrift.style.fontFamily;
      try {
        await document.fonts.load(`600 120px ${familie}`);
      } catch {
        // Zonder lettertype tekent de browser een vervanger; nog steeds leesbaar.
      }
      if (weg) return;
      const c = ctx();
      if (!c) return;
      c.clearRect(0, 0, B, H);
      const t = tekst.trim();
      if (t.length < 2) {
        setLeeg(true);
        onChange(null);
        return;
      }
      let maat = 140;
      c.font = `600 ${maat}px ${familie}`;
      while (c.measureText(t).width > B - 80 && maat > 40) {
        maat -= 6;
        c.font = `600 ${maat}px ${familie}`;
      }
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillText(t, B / 2, H * 0.68);
      setLeeg(false);
      onChange(canvas.current!.toDataURL("image/png"));
    };
    void naamTekenen();
    return () => {
      weg = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modus, tekst]);

  function wissel(m: Modus) {
    if (m === modus) return;
    setModus(m);
    ctx()?.clearRect(0, 0, B, H);
    lengte.current = 0;
    setLeeg(true);
    onChange(null);
  }

  function punt(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * B, y: ((e.clientY - r.top) / r.height) * H };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (modus !== "tekenen") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    tekent.current = true;
    const p = punt(e);
    punten.current = [p];
    const c = ctx();
    if (!c) return;
    c.beginPath();
    c.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
    c.fill();
  }

  function beweeg(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!tekent.current) return;
    e.preventDefault();
    const c = ctx();
    if (!c) return;
    const p = punt(e);
    const pts = punten.current;
    const vorig = pts[pts.length - 1];
    lengte.current += Math.hypot(p.x - vorig.x, p.y - vorig.y);
    pts.push(p);
    // Een vloeiende lijn: kwadratische boog door het midden van de laatste twee punten.
    if (pts.length >= 3) {
      const a = pts[pts.length - 3];
      const b = pts[pts.length - 2];
      const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const m2 = { x: (b.x + p.x) / 2, y: (b.y + p.y) / 2 };
      const druk = e.pointerType === "pen" && e.pressure > 0 ? 3 + e.pressure * 4 : 5;
      c.lineWidth = druk;
      c.beginPath();
      c.moveTo(m1.x, m1.y);
      c.quadraticCurveTo(b.x, b.y, m2.x, m2.y);
      c.stroke();
    }
  }

  function stop() {
    if (!tekent.current) return;
    tekent.current = false;
    // Een stip of een krabbel van een paar millimeter is geen handtekening.
    if (lengte.current > 120) {
      setLeeg(false);
      onChange(canvas.current!.toDataURL("image/png"));
    }
  }

  const tab = (m: Modus, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modus === m}
      onClick={() => wissel(m)}
      className={`h-9 rounded-[9px] px-4 text-[14px] font-semibold transition-colors ${
        modus === m ? "bg-white text-[#322E83] shadow-[0_1px_2px_rgba(28,26,78,0.12)]" : "text-[#6D6A92] hover:text-[#322E83]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Manier van ondertekenen" className="inline-flex rounded-[11px] bg-[#F1EFF7] p-1">
          {tab("tekenen", "Tekenen")}
          {tab("typen", "Typen")}
        </div>
        {!leeg && modus === "tekenen" && (
          <button type="button" onClick={wis} className="text-[14px] font-semibold text-[#6D6A92] underline-offset-4 hover:text-[#322E83] hover:underline">
            Opnieuw
          </button>
        )}
      </div>
      {modus === "typen" && (
        <input
          className="mb-2.5 h-[48px] w-full rounded-[12px] border border-[#DCDBEA] bg-white px-4 text-[16px] text-[#322E83] outline-none focus:border-[#322E83] focus:shadow-[0_0_0_3px_rgba(50,46,131,0.12)]"
          value={tekst}
          onChange={(e) => setGetypt(e.target.value)}
          aria-label="Je naam als handtekening"
          autoComplete="name"
        />
      )}
      <div className="relative overflow-hidden rounded-[14px] border border-dashed border-[#BDBBD3] bg-white">
        <canvas
          id={id}
          ref={canvas}
          width={B}
          height={H}
          aria-label={modus === "tekenen" ? "Teken hier je handtekening" : "Je getypte handtekening"}
          role="img"
          className={`block aspect-[10/3] w-full ${modus === "tekenen" ? "cursor-crosshair touch-none" : ""}`}
          onPointerDown={start}
          onPointerMove={beweeg}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[6%] bottom-[24%] flex items-end gap-2 border-b border-[#D8D6E6] pb-1">
          <span className="text-[18px] leading-none text-[#BDBBD3]">×</span>
        </div>
        {leeg && modus === "tekenen" && (
          <p aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[28%] text-center text-[15px] text-[#A3A1BC]">
            Teken hier je handtekening
          </p>
        )}
      </div>
    </div>
  );
}

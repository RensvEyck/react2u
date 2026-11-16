"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nodigMachtigingUitBeheer, verstuurOverdrachtBeheer, verwijderMachtigingBeheer, type BeheerState } from "@/app/admin/onboardingActions";
import type { Machtiging } from "@/lib/onboarding";
import { datumLang, momentLang } from "@/lib/offertes";
import { LuCircle, LuCircleCheck, LuFileDown, LuMailCheck, LuSend, LuTrash2, LuBellRing, LuGlobe } from "react-icons/lu";

/*
 * Het deel Werknemer van een onboarding in het beheer (0039): wie de machtiging
 * voor de overdracht van zijn verzuimdossier tekent. React2u nodigt uit (uit het
 * werknemersbestand of met de hand), ziet per werknemer de stand met het
 * IP-adres van de ondertekening, en verstuurt namens de werkgever de opdracht
 * tot overdracht naar de vorige arbodienst.
 */

function Melding({ s }: { s: BeheerState | null }) {
  if (!s) return null;
  return s.ok ? (
    <p role="status" className="rounded-[10px] bg-[#e3f6ed] px-3 py-2 text-[13.5px] font-semibold text-[#0a7a4b]">{s.melding}</p>
  ) : (
    <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#b42318]">{s.fout}</p>
  );
}

export type MachtigingRij = Pick<Machtiging, "id" | "naam" | "email" | "status" | "uitgenodigd_at" | "herinnerd_at" | "bekeken_at" | "getekend_at" | "overdracht_at" | "getekend_ip">;

export default function MachtigingBeheer({ id, bedrijf, arbodienst, kandidaten, lijst, open }: {
  id: string;
  bedrijf: string;
  arbodienst: Record<string, string> | null;
  /** Medewerkers uit het werknemersbestand met een e-mailadres: om uit te kiezen. */
  kandidaten: { naam: string; email: string }[];
  lijst: MachtigingRij[];
  /** Of de onboarding verstuurd is (anders kan er nog niemand tekenen). */
  open: boolean;
}) {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<BeheerState | null>(null);
  const [bezig, start] = useTransition();
  const [aan, setAan] = useState(arbodienst?.email || "");
  const [ovState, setOvState] = useState<BeheerState | null>(null);
  const [ovBezig, startOv] = useTransition();
  const [druk, setDruk] = useState<string | null>(null);
  const router = useRouter();
  const getekend = lijst.filter((m) => m.status === "getekend");
  const nogNiet = getekend.filter((m) => !m.overdracht_at);
  const laatsteOverdracht = getekend.map((m) => m.overdracht_at).filter((x): x is string => Boolean(x)).sort().pop() ?? null;
  const alUitgenodigd = new Set(lijst.map((m) => m.email.toLowerCase()));
  const keuze = kandidaten.filter((k) => !alUitgenodigd.has(k.email.toLowerCase()));

  function nodigUit(n: string, e: string, sleutel: string) {
    setState(null);
    setDruk(sleutel);
    start(async () => {
      const r = await nodigMachtigingUitBeheer(id, { naam: n, email: e });
      setDruk(null);
      setState(r.ok ? { ok: true, melding: r.melding } : r);
      if (r.ok) {
        setNaam("");
        setEmail("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section id="machtigingen" className="acard p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wie tekent de machtiging?</h2>
            <p className="mt-1 text-[13.5px] text-black/50">
              Elke zieke medewerker met een lopend dossier bij {arbodienst?.arbodienst || "de vorige arbodienst"} tekent zelf, op zijn telefoon. De ondertekening legt het IP-adres, het apparaat en een controlegetal vast.
            </p>
          </div>
          <span className="text-[13px] font-semibold text-black/55">{getekend.length} van {lijst.length} getekend</span>
        </div>

        {lijst.length > 0 && (
          <ul className="mt-4 divide-y divide-black/[0.05]">
            {lijst.map((m) => {
              const klaar = m.status === "getekend";
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  {klaar ? <LuCircleCheck className="shrink-0 text-[18px] text-[#0a7a4b]" /> : <LuCircle className="shrink-0 text-[18px] text-black/20" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#1c1a4e]">{m.naam} <span className="font-normal text-black/45">· {m.email}</span></span>
                    <span className="block text-[12.5px] text-black/45">
                      {klaar
                        ? <>Getekend {momentLang(m.getekend_at)}{m.getekend_ip ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[11.5px] text-black/60"><LuGlobe className="text-[12px]" /> IP {m.getekend_ip}</span> : null}{m.overdracht_at ? ` · met de opdracht naar de arbodienst ${datumLang(m.overdracht_at)}` : " · nog niet naar de arbodienst"}</>
                        : `Uitgenodigd ${momentLang(m.uitgenodigd_at)}${m.herinnerd_at ? `, herinnerd ${momentLang(m.herinnerd_at)}` : ""}${m.bekeken_at ? `, geopend ${momentLang(m.bekeken_at)}` : ", nog niet geopend"}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-[12.5px] font-semibold">
                    {klaar ? (
                      <a href={`/admin/onboarding/${id}/machtiging/${m.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[#312e82] hover:underline"><LuFileDown /> Pdf</a>
                    ) : (
                      <>
                        <button type="button" disabled={bezig} onClick={() => nodigUit(m.naam, m.email, m.id)} className="inline-flex items-center gap-1 text-[#312e82] hover:underline disabled:opacity-50"><LuBellRing /> {druk === m.id ? "Versturen…" : "Herinneren"}</button>
                        <button
                          type="button"
                          disabled={bezig}
                          onClick={() => start(async () => { const r = await verwijderMachtigingBeheer(id, m.id); setState(r); if (r.ok) router.refresh(); })}
                          className="inline-flex items-center gap-1 text-[#b42318] hover:underline disabled:opacity-50"
                        >
                          <LuTrash2 /> Weghalen
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-4 space-y-3 rounded-[14px] bg-[#f6f5fb] p-5"
          onSubmit={(e) => { e.preventDefault(); nodigUit(naam, email, "nieuw"); }}
        >
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Werknemer uitnodigen</p>
          {!open && <p className="text-[13px] text-[#b86e00]">Verstuur de onboarding eerst; daarna kunnen werknemers tekenen.</p>}
          {!arbodienst && <p className="text-[13px] text-[#b86e00]">Vul eerst de vorige arbodienst in; die komt op de machtiging.</p>}
          {keuze.length > 0 && (
            <div>
              <label className="alabel" htmlFor="mu-kies">Uit het werknemersbestand</label>
              <select
                id="mu-kies"
                className="ainput"
                value=""
                onChange={(e) => {
                  const k = keuze.find((x) => x.email === e.target.value);
                  if (k) { setNaam(k.naam); setEmail(k.email); }
                }}
              >
                <option value="">Kies een medewerker met e-mailadres…</option>
                {keuze.map((k) => <option key={k.email} value={k.email}>{k.naam} · {k.email}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
            <div>
              <label className="alabel" htmlFor="mu-naam">Naam</label>
              <input id="mu-naam" className="ainput" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={120} autoComplete="off" />
            </div>
            <div>
              <label className="alabel" htmlFor="mu-email">E-mailadres</label>
              <input id="mu-email" className="ainput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" />
            </div>
            <div className="flex items-end">
              <button className="abtn" disabled={bezig || !open || !arbodienst || !naam.trim() || !email.trim()}><LuSend /> {druk === "nieuw" ? "Versturen…" : "Uitnodiging sturen"}</button>
            </div>
          </div>
          <p className="text-[12.5px] text-black/45">De werknemer krijgt een mail uit naam van React2u met de naam van {bedrijf} erin, en een persoonlijke link om te tekenen. Dezelfde werknemer nog eens uitnodigen is een herinnering (hooguit één per uur).</p>
          <Melding s={state} />
        </form>
      </section>

      <section id="overdracht" className="acard p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuMailCheck /> Opdracht tot overdracht naar {arbodienst?.arbodienst || "de vorige arbodienst"}</h2>
            <p className="mt-1 max-w-[720px] text-[13.5px] leading-[1.55] text-black/50">
              Namens {bedrijf} geven wij de vorige arbodienst de opdracht om de dossiers over te dragen: de brief met alle getekende machtigingen erachter als één pdf, naar het mailadres van de arbodienst; de werkgever en medisch@react2u.nl krijgen een kopie, antwoorden gaat naar de werkgever. Die arbodienst stuurt ons daarna de lijst en de dossiers.
            </p>
          </div>
          {getekend.length > 0 && (
            <a href={`/admin/onboarding/${id}/overdracht`} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuFileDown /> Opdracht als pdf</a>
          )}
        </div>
        {laatsteOverdracht && (
          <p className="mt-3 rounded-[10px] bg-[#e3f6ed] px-3 py-2 text-[13.5px] font-semibold text-[#0a7a4b]">
            Opdracht verstuurd {momentLang(laatsteOverdracht)}.{nogNiet.length > 0 ? ` Sinds toen ${nogNiet.length === 1 ? "tekende nog 1 werknemer" : `tekenden nog ${nogNiet.length} werknemers`}: stuur de opdracht nog een keer.` : ""}
          </p>
        )}
        {getekend.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-black/50">Zodra een werknemer heeft getekend, kun je de opdracht versturen.</p>
        ) : (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              setOvState(null);
              startOv(async () => {
                const r = await verstuurOverdrachtBeheer(id, aan);
                setOvState(r);
                if (r.ok) router.refresh();
              });
            }}
          >
            <div>
              <label className="alabel" htmlFor="ov-email">E-mailadres van de vorige arbodienst</label>
              <input id="ov-email" className="ainput" type="email" value={aan} onChange={(e) => setAan(e.target.value)} maxLength={254} placeholder="dossiers@arbodienst.nl" />
            </div>
            <div className="flex items-end">
              <button className="abtn" disabled={ovBezig || !aan.trim()}><LuSend /> {ovBezig ? "Versturen…" : laatsteOverdracht ? "Opdracht opnieuw versturen" : `Verstuur de opdracht (${getekend.length})`}</button>
            </div>
            <div className="sm:col-span-2"><Melding s={ovState} /></div>
          </form>
        )}
      </section>
    </div>
  );
}

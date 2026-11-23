import Link from "next/link";
import { LuArrowDownWideNarrow, LuBellRing, LuClock, LuLightbulb, LuPlus, LuSparkles, LuTriangleAlert } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import {
  IDEE_STATUS, isStatus, langOpen, leesSortering, meldingTekst, nieuwDezeWeek, sorteer, telPerStatus, zichtbaarVoor, type Kijker, type Sortering,
} from "@/lib/ideeen";
import { haalBord } from "@/lib/ideeenDb";
import { inMijnReact2u } from "@/lib/weergave";
import { ideeIndienen, meldingenGezien } from "@/app/admin/ideeenActions";
import { MigratieNodig } from "@/components/admin/Kerncijfer";
import Uitklap from "@/components/admin/Uitklap";
import { IdeeKaart, IdeeVelden } from "@/components/admin/ideeen/IdeeBits";
import MeldingenGezien from "@/components/admin/ideeen/MeldingenGezien";

/**
 * Ideeënbord (0055; Rens, 23 nov 2026): wat collega's inbrengen en wat ermee
 * gebeurt. Elk idee is een kaart met soort, status, stemmen en reacties;
 * filteren per status, sorteren op nieuwste of meeste stemmen, en een eigen
 * knop om iets in te dienen. Wat via de weekevaluatie gemeld wordt staat er
 * ook. Wie het recht omzet heeft (en in Beheer kijkt) ziet ook de
 * vertrouwelijke ideeën en zet de status op de kaart van het idee.
 */
export default async function Ideeenbord({ searchParams }: { searchParams: Promise<{ status?: string; sorteer?: string }> }) {
  const { sb, admin } = await requirePerm("ideeen");
  // In Mijn React2u zie je het bord zoals een collega: zonder vertrouwelijke ideeën van anderen en zonder het signaal.
  const mijn = await inMijnReact2u(admin.permissions);
  const kijker: Kijker = { userId: admin.userId, beheer: admin.permissions.includes("omzet") && !mijn };
  const vandaag = datumOver(0);
  const sp = await searchParams;
  const filter = isStatus(sp.status) ? sp.status : null;
  const sortering = leesSortering(sp.sorteer);
  const uit = await haalBord(sb, admin.userId);

  if (!uit.ok) {
    return (
      <div className="space-y-6">
        <Kop />
        {uit.fout === "migratie" ? (
          <MigratieNodig bestand="0055_ideeenbord.sql" wat="Het ideeënbord heeft nieuwe tabellen en een nieuw recht nodig." />
        ) : (
          <p className="acard px-6 py-5 text-[14px] text-black/55">Het bord kon niet geladen worden. Probeer het straks nog eens.</p>
        )}
      </div>
    );
  }

  // De database geeft al alleen wat je mag zien; in Mijn React2u kijkt een beheerder bewust als collega.
  const alle = uit.data.ideeen.filter((i) => zichtbaarVoor(i, kijker));
  const tellingen = telPerStatus(alle);
  const lijst = sorteer(filter ? alle.filter((i) => i.status === filter) : alle, sortering);
  const nieuw = nieuwDezeWeek(alle, vandaag).length;
  const wachten = kijker.beheer ? langOpen(alle, vandaag) : [];
  const titels = new Map(uit.data.ideeen.map((i) => [i.id, i.titel]));
  const adres = (status: string | null, hoe: Sortering) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (hoe !== "nieuwste") q.set("sorteer", hoe);
    const s = q.toString();
    return `/admin/ideeen${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <Kop nieuw={nieuw} totaal={alle.length} />

      {/* ---------- nieuw voor jou ---------- */}
      {uit.data.meldingen.length > 0 && (
        <section className="acard overflow-hidden ring-1 ring-[#e75387]/25" id="nieuw-voor-jou" aria-labelledby="nieuw-voor-jou-kop">
          <MeldingenGezien gezien={meldingenGezien} />
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fdeef4] text-[16px] text-[#e0356b]"><LuBellRing /></span>
            <h2 id="nieuw-voor-jou-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Nieuw voor jou</h2>
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {uit.data.meldingen.map((m) => {
              const t = meldingTekst(m, titels.get(m.idee_id) ?? "een idee");
              return (
                <li key={m.id}>
                  <Link href={`/admin/ideeen/${m.idee_id}`} className="block px-6 py-3 transition hover:bg-[#fafafd]">
                    <span className="block text-[14.5px] font-medium text-[#1c1a4e]">{t.kop}</span>
                    {t.sub && <span className="block text-[12.5px] text-black/45">{t.sub}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- signaal voor het beheer ---------- */}
      {wachten.length > 0 && (
        <section className="acard flex flex-wrap items-start gap-4 border-l-[3px] border-l-[#c77700] px-5 py-4" id="ideeen-wachten" aria-labelledby="wachten-kop">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4e5] text-[18px] text-[#c77700]"><LuTriangleAlert /></span>
          <div className="min-w-[200px] flex-1">
            <h2 id="wachten-kop" className="text-[14.5px] font-semibold text-[#1c1a4e]">
              {wachten.length === 1 ? "Eén idee wacht al langer dan twee weken" : `${wachten.length} ideeën wachten al langer dan twee weken`}
            </h2>
            <p className="text-[13px] text-black/55">
              Ze staan nog op Ingediend. Zet ze op Bekeken met een regel erbij, dan weet de collega dat het gezien is:{" "}
              {wachten.slice(0, 3).map((i, n) => (
                <span key={i.id}>{n > 0 ? ", " : ""}<Link href={`/admin/ideeen/${i.id}`} className="font-semibold text-[#312e82] hover:underline">{i.titel}</Link></span>
              ))}
              {wachten.length > 3 ? ` en nog ${wachten.length - 3}.` : "."}
            </p>
          </div>
        </section>
      )}

      {/* ---------- indienen ---------- */}
      <Uitklap id="nieuw" label="Idee indienen">
        <form action={ideeIndienen} className="space-y-4">
          <p className="text-[13.5px] text-black/55">Een idee, iets wat niet lekker loopt, een compliment of een vraag: het komt op het bord en het beheer laat weten wat ermee gebeurt.</p>
          <IdeeVelden prefix="nieuw" />
          <button className="abtn"><LuPlus /> Op het bord</button>
        </form>
      </Uitklap>

      {/* ---------- filter en sortering ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3" id="filter">
        <nav aria-label="Status" className="flex flex-wrap gap-1.5">
          <Filter href={adres(null, sortering)} actief={filter === null} label="Alles" aantal={alle.length} />
          {IDEE_STATUS.map((s) => <Filter key={s.key} href={adres(s.key, sortering)} actief={filter === s.key} label={s.label} aantal={tellingen[s.key]} stip={s.stip} />)}
        </nav>
        <nav aria-label="Sorteren" className="flex items-center gap-1 rounded-xl bg-[#f6f5fb] p-1 text-[12.5px] font-semibold">
          <LuArrowDownWideNarrow className="ml-1.5 text-[14px] text-black/35" aria-hidden />
          <Link href={adres(filter, "nieuwste")} aria-current={sortering === "nieuwste" ? "true" : undefined} className={`rounded-lg px-2.5 py-1 transition-colors ${sortering === "nieuwste" ? "bg-white text-[#312e82] shadow-sm" : "text-black/50 hover:text-[#312e82]"}`}>Nieuwste</Link>
          <Link href={adres(filter, "stemmen")} aria-current={sortering === "stemmen" ? "true" : undefined} className={`rounded-lg px-2.5 py-1 transition-colors ${sortering === "stemmen" ? "bg-white text-[#312e82] shadow-sm" : "text-black/50 hover:text-[#312e82]"}`}>Meeste stemmen</Link>
        </nav>
      </div>

      {/* ---------- het bord ---------- */}
      {lijst.length === 0 ? (
        <section className="acard flex flex-col items-center gap-3 px-6 py-14 text-center" id="bord-leeg">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4e5] text-[22px] text-[#c77700]"><LuLightbulb /></span>
          <p className="max-w-[440px] text-[14.5px] leading-[1.6] text-black/55">
            {alle.length === 0
              ? "Het bord is nog leeg. Heb jij een idee, loopt iets niet lekker, of verdient een collega een compliment? Zet het erop."
              : `Niets met de status ${IDEE_STATUS.find((s) => s.key === filter)?.label ?? "die je koos"}.`}
          </p>
          {alle.length === 0 ? (
            <a href="#nieuw" className="abtn !py-2 text-[13.5px]"><LuPlus /> Idee indienen</a>
          ) : (
            <Link href={adres(null, sortering)} className="abtn-ghost !py-2 text-[13.5px]">Alles tonen</Link>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" id="bord">
          {lijst.map((i) => <IdeeKaart key={i.id} idee={i} kijker={kijker} vandaag={vandaag} />)}
        </div>
      )}

      <p className="flex items-start gap-2 text-[12.5px] text-black/40">
        <LuClock className="mt-0.5 shrink-0" aria-hidden />
        <span>Wat je in je weekevaluatie bij <em>Iets melden of delen</em> schrijft, komt hier ook. Het beheer zet de status en schrijft erbij wat ermee gebeurt; jij krijgt daar een bericht van.</span>
      </p>
    </div>
  );
}

function Kop({ nieuw, totaal }: { nieuw?: number; totaal?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Ideeënbord</h1>
        <p className="text-[14.5px] text-black/50">
          Wat collega&apos;s inbrengen en wat ermee gebeurt.
          {typeof totaal === "number" && totaal > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[13px] text-black/40" data-ideeen-kop>
              <LuSparkles className="text-[13px] text-[#e75387]" aria-hidden /> {totaal} {totaal === 1 ? "idee" : "ideeën"}{nieuw ? `, ${nieuw} nieuw deze week` : ""}
            </span>
          )}
        </p>
      </div>
      <a href="#nieuw" className="abtn"><LuPlus /> Idee indienen</a>
    </div>
  );
}

function Filter({ href, actief, label, aantal, stip }: { href: string; actief: boolean; label: string; aantal: number; stip?: string }) {
  return (
    <Link
      href={href}
      aria-current={actief ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        actief ? "bg-[#312e82] text-white" : "bg-white text-black/55 ring-1 ring-black/[0.08] hover:text-[#312e82]"
      }`}
    >
      {stip && <span className={`h-1.5 w-1.5 rounded-full ${actief ? "bg-[#ff8ab5]" : stip}`} aria-hidden />}
      {label}
      <span className={`tabular-nums ${actief ? "text-white/70" : "text-black/35"}`}>{aantal}</span>
    </Link>
  );
}

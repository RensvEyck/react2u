import Link from "next/link";
import { LuEuro, LuExternalLink, LuFilePenLine, LuRepeat, LuZap } from "react-icons/lu";
import { datumLang } from "@/lib/offertes";
import { PERIODE_LABEL, type KlantTarief, type LosseAfspraak, type OfferteAfspraak } from "@/lib/stamkaart";
import { euro } from "@/lib/offertes";
import Afspraken from "./Afspraken";

/**
 * Het tabblad Tariefafspraken: wat met deze klant is afgesproken. Uit de
 * getekende offertes per label de regels met het bedrag zoals het op de
 * offerte staat (niets wordt hier uitgerekend), de losse klanten en
 * opdrachten, en de afwijkende afspraken buiten de prijslijst om, die je
 * hier zelf bijhoudt.
 */
export default function TarievenTab({
  klantId, offertes, los, tarieven, vandaag, tarievenjaar, aan,
}: {
  klantId: string;
  offertes: OfferteAfspraak[];
  los: LosseAfspraak[];
  tarieven: KlantTarief[];
  vandaag: string;
  tarievenjaar: string;
  aan: boolean;
}) {
  const niets = offertes.length === 0 && los.length === 0;
  return (
    <div className="space-y-5">
      <section className="space-y-4" aria-labelledby="kl-offertes">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="kl-offertes" className="font-heading text-[17px] font-bold text-[#312e82]">Uit getekende offertes</h2>
            <p className="text-[13.5px] text-black/50">Per offerte wat de klant koos en tekende, met het bedrag zoals het op de offerte staat. Nieuwe offertes gaan uit de prijslijst van {tarievenjaar}.</p>
          </div>
          <Link href="/admin/offertes/nieuw" className="abtn-ghost !py-1.5 text-[13px]"><LuFilePenLine /> Nieuwe offerte</Link>
        </div>
        {offertes.length === 0 ? (
          <p className="acard px-5 py-6 text-center text-[13.5px] text-black/45">Nog geen getekende offerte voor deze klant.</p>
        ) : (
          offertes.map((o) => (
            <article key={o.id} className="acard overflow-hidden" data-offerte={o.nummer}>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={o.href} className="font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">Offerte {o.nummer}</Link>
                    <span className="apill !text-[12px]" style={{ background: "#e3f6ed", color: "#0a7a4b" }}>getekend</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-black/45">
                    {o.vorm}{o.getekend_at ? ` · getekend ${datumLang(o.getekend_at)}` : ""}{o.getekend_naam ? ` door ${o.getekend_naam}` : ""}{o.medewerkers ? ` · ${o.medewerkers} medewerkers` : ""}
                  </p>
                </div>
                <p className="text-right text-[13px] text-black/55">
                  {o.perMaand > 0 && <span className="block"><span className="font-heading text-[18px] font-bold text-[#1c1a4e]">{euro(o.perMaand)}</span> per maand</span>}
                  {o.eenmalig > 0 && <span className="block"><span className="font-semibold text-[#1c1a4e]">{euro(o.eenmalig)}</span> eenmalig</span>}
                  {o.perMaand === 0 && o.eenmalig === 0 && <span className="block">op aanvraag of bij gebruik</span>}
                </p>
              </header>
              <div className="divide-y divide-black/[0.05]">
                {o.groepen.map((g) => (
                  <div key={g.label} className="px-5 py-3">
                    <p className="mb-1.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: g.merk?.tekst || "#6b6a85" }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: g.merk?.kleur || "#6b6a85" }} aria-hidden="true" />
                      {g.label}
                    </p>
                    <table className="w-full text-[13.5px]">
                      <tbody className="divide-y divide-black/[0.04]">
                        {g.regels.map((r, i) => (
                          <tr key={`${r.naam}-${i}`} className="align-top">
                            <td className="py-1.5 pr-4">
                              <span className="block text-[#1c1a4e]">{r.naam}</span>
                              {r.omschrijving && <span className="block text-[12px] text-black/40">{r.omschrijving}</span>}
                            </td>
                            <td className="py-1.5 pr-4 text-right font-semibold tabular-nums text-[#1c1a4e] sm:whitespace-nowrap">
                              {r.bedrag}
                              {r.aantal && <span className="block text-[12px] font-normal text-black/40">× {r.aantal}</span>}
                            </td>
                            <td className="whitespace-nowrap py-1.5 text-right sm:w-[120px]">
                              <Periode periode={r.periode} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3" aria-labelledby="kl-los">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="kl-los" className="font-heading text-[17px] font-bold text-[#312e82]">Losse klanten en opdrachten</h2>
            <p className="text-[13.5px] text-black/50">Wat buiten de offertes om is opgevoerd: een abonnement per maand of een eenmalige opdracht.</p>
          </div>
          <Link href="/admin/verkoop/los" className="abtn-ghost !py-1.5 text-[13px]"><LuEuro /> Los opvoeren</Link>
        </div>
        {los.length === 0 ? (
          <p className="acard px-5 py-6 text-center text-[13.5px] text-black/45">{niets ? "Ook niets los opgevoerd." : "Niets los opgevoerd voor deze klant."}</p>
        ) : (
          <ul className="acard divide-y divide-black/[0.05]">
            {los.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" data-los={l.id}>
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[15px] text-black/50">{l.soort === "abonnement" ? <LuRepeat /> : <LuZap />}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#1c1a4e]">{l.omschrijving}</span>
                    <span className="block text-[12.5px] text-black/45">
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: l.kleur }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: l.kleur }} aria-hidden="true" />{l.label}</span>
                      {" · "}sinds {datumLang(l.datum)}{l.stop ? ` · gestopt per ${datumLang(l.stop)}` : ""}{l.verkoper ? ` · ${l.verkoper}` : ""}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-[#1c1a4e]">{l.bedrag}</span>
                  <Periode periode={l.periode} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="kl-afspraken">
        <div>
          <h2 id="kl-afspraken" className="font-heading text-[17px] font-bold text-[#312e82]">Afwijkende afspraken</h2>
          <p className="text-[13.5px] text-black/50">Wat buiten de prijslijst valt: een afgesproken uurtarief, een korting, een vast bedrag voor iets wat niet op de lijst staat. Vrije regels, met ingangsdatum.</p>
        </div>
        {aan ? (
          <Afspraken klantId={klantId} tarieven={tarieven} vandaag={vandaag} />
        ) : (
          <p className="acard px-5 py-6 text-center text-[13.5px] text-black/45">Afwijkende afspraken kun je vastleggen zodra migratie 0048 in Supabase is uitgevoerd.</p>
        )}
      </section>

      <p className="text-[12.5px] text-black/40">
        Alle bedragen exclusief btw, zoals vastgelegd. Een bedrag per regel is de prijs op de offerte; de totalen zijn die van de offerte zelf. <Link href="/admin/offertes" className="inline-flex items-center gap-0.5 font-semibold text-[#312e82] hover:underline">Alle offertes <LuExternalLink className="text-[11px]" /></Link>
      </p>
    </div>
  );
}

function Periode({ periode }: { periode: keyof typeof PERIODE_LABEL }) {
  const stijl =
    periode === "abonnement" ? { background: "#eef0ff", color: "#312e82" }
    : periode === "eenmalig" ? { background: "#fff4e5", color: "#b86e00" }
    : periode === "bij gebruik" ? { background: "#e6f2ff", color: "#0b6bcb" }
    : { background: "rgba(13,13,40,0.06)", color: "#6b6a85" };
  return <span className="apill !px-2 !py-0.5 !text-[11.5px]" style={stijl}>{PERIODE_LABEL[periode]}</span>;
}

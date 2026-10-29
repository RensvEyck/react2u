import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import OfferteEditor, { type EditorBegin } from "@/components/admin/OfferteEditor";
import { laadCatalogus, laadSjablonen, standaardAfzender, uitAanvraag } from "@/lib/offerteBeheer";
import { datumOver, VORMEN, type Vorm } from "@/lib/offertes";
import { aantalOnderdelen, sjabloonVoorStart, type Sjabloon } from "@/lib/offerteSjablonen";
import { LuArrowLeft, LuInbox, LuFilePlus, LuSettings2, LuChevronRight } from "react-icons/lu";

/**
 * Nieuwe offerte. Eerst de vorm: een sjabloon met tekst, onderdelen,
 * voorwaarden en geldigheid (lib/offerteSjablonen.ts, plus wat het team
 * aanpaste). Daarna de editor met alles ingevuld. Vanuit een offerteaanvraag
 * in het Postvak IN (?bericht=<id>) staan klant en aansluiting al klaar.
 */
export default async function NieuweOfferte({
  searchParams,
}: {
  searchParams: Promise<{ bericht?: string; start?: string; sjabloon?: string }>;
}) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { bericht, start, sjabloon } = await searchParams;
  const catalogus = await laadCatalogus(sb);
  const [{ sjablonen }, afzender, aanvraag] = await Promise.all([
    laadSjablonen(sb, catalogus),
    standaardAfzender(sb, user.id, admin.email),
    bericht && /^[0-9a-f-]{36}$/.test(bericht) && admin.permissions.includes("postvak") ? uitAanvraag(sb, bericht) : Promise.resolve(null),
  ]);

  const sleutel = sjabloon || sjabloonVoorStart(start) || (aanvraag ? `verzuim-${aanvraag.startpunt}` : null);
  const gekozen = sjablonen.find((s) => s.sleutel === sleutel);
  const kop = (
    <div className="flex flex-col gap-3">
      <Link href="/admin/offertes" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
        <LuArrowLeft /> Alle offertes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">
          Nieuwe offerte{gekozen ? `: ${gekozen.naam}` : ""}
        </h1>
        {(gekozen || sleutel === "leeg") && (
          <Link href={`/admin/offertes/nieuw${bericht ? `?bericht=${bericht}&sjabloon=kies` : ""}`} className="text-[13.5px] font-semibold text-[#312e82] hover:underline">
            Andere vorm kiezen
          </Link>
        )}
      </div>
      {aanvraag && (
        <p className="flex items-center gap-2 text-[14px] text-black/55">
          <LuInbox className="text-[#312e82]" /> Ingevuld vanuit de offerteaanvraag van {aanvraag.contactpersoon}
          {aanvraag.bedrijf ? ` (${aanvraag.bedrijf})` : ""}. Controleer en vul aan.
        </p>
      )}
    </div>
  );

  if (!gekozen && sleutel !== "leeg") {
    return (
      <div className="space-y-6">
        {kop}
        <Kiezer sjablonen={sjablonen} bericht={bericht && aanvraag ? bericht : undefined} />
      </div>
    );
  }

  const begin: EditorBegin = {
    ...afzender,
    geldig_tot: datumOver(gekozen?.geldigDagen ?? 30),
    ...(gekozen
      ? {
          vorm: gekozen.vorm, titel: gekozen.titel, intro: gekozen.intro, inhoud: gekozen.inhoud,
          voorwaarden: gekozen.voorwaarden, vervolg: gekozen.vervolg, regels: gekozen.regels,
        }
      : { titel: "Offerte", regels: [] }),
    ...(aanvraag
      ? { bedrijf: aanvraag.bedrijf, contactpersoon: aanvraag.contactpersoon, email: aanvraag.email, telefoon: aanvraag.telefoon, medewerkers: aanvraag.medewerkers }
      : {}),
  };

  return (
    <div className="space-y-6">
      {kop}
      <OfferteEditor begin={begin} catalogus={catalogus} />
    </div>
  );
}

const GROEPEN = ["Verzuim", "Preventie", "Re-integratie"] as const;

function Kiezer({ sjablonen, bericht }: { sjablonen: Sjabloon[]; bericht?: string }) {
  const href = (sleutel: string) => `/admin/offertes/nieuw?${bericht ? `bericht=${bericht}&` : ""}sjabloon=${sleutel}`;
  return (
    <div className="space-y-6">
      {GROEPEN.map((groep) => {
        const lijst = sjablonen.filter((s) => VORMEN[s.vorm].groep === groep);
        if (!lijst.length) return null;
        return (
          <section key={groep}>
            <h2 className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.08em] text-black/45">{groep}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lijst.map((s) => (
                <Link
                  key={s.sleutel}
                  href={href(s.sleutel)}
                  className="acard group flex items-start gap-3.5 p-5 transition-[border-color,box-shadow] hover:border-[#312e82]/30 hover:shadow-[0_8px_24px_-16px_rgba(49,46,130,0.45)]"
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VORMEN[s.vorm as Vorm].kleur }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#1c1a4e]">{s.naam}</span>
                      {s.bron.soort === "aangepast" && (
                        <span className="apill bg-[#eef0ff] !px-2 !py-0.5 !text-[11px] text-[#312e82]">{s.bron.heeftStandaard ? "aangepast" : "eigen"}</span>
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] leading-[1.5] text-black/50">{s.omschrijving}</span>
                    <span className="mt-2 block text-[12px] text-black/40">
                      {aantalOnderdelen(s.regels)} · {s.geldigDagen} dagen geldig
                    </span>
                  </span>
                  <LuChevronRight className="mt-1 shrink-0 text-black/25 group-hover:text-[#312e82]" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-5">
        <Link href={href("leeg")} className="abtn-ghost !py-1.5 text-[13px]"><LuFilePlus /> Leeg beginnen</Link>
        <Link href="/admin/offertes/sjablonen" className="abtn-ghost !py-1.5 text-[13px]"><LuSettings2 /> Sjablonen beheren</Link>
      </div>
    </div>
  );
}

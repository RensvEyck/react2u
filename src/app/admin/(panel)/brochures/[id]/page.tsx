import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import {
  heropenBrochure, markeerBrochureVerstuurd, nieuweBrochureLink, saveBrochureNotitie, trekBrochureIn, verstuurBrochure, verwijderBrochure,
} from "@/app/admin/brochureActions";
import BrochureForm from "@/components/admin/BrochureForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { brochureUrl } from "@/lib/mail";
import { BROCHURE_WEERGAVE, brochureWeergave, type Brochure, type BrochureGebeurtenis } from "@/lib/brochures";
import { momentLang } from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil, LuStickyNote, LuFileDown, LuFilePenLine,
} from "react-icons/lu";

/**
 * Eén brochure: versturen of herinneren, wat de prospect deed, en de gegevens
 * om aan te passen. Vanaf hier maak je ook de offerte die erop volgt.
 */

const ICONEN: Record<BrochureGebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, ingetrokken: LuBan, heropend: LuRotateCcw,
};

function zin(g: BrochureGebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${door}`;
    case "bekeken": return "Bekeken door de prospect";
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
  }
}

export default async function BrochureAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [brochureRes, tijdlijnRes] = await Promise.all([
    sb.from("brochures").select("*").eq("id", id).maybeSingle(),
    sb.from("brochure_gebeurtenissen").select("*").eq("brochure_id", id).order("at", { ascending: false }).limit(200),
  ]);
  if (!brochureRes.data) notFound();
  const b = brochureRes.data as Brochure;
  const tijdlijn = (tijdlijnRes.data as BrochureGebeurtenis[]) || [];
  const w = brochureWeergave(b);
  const s = BROCHURE_WEERGAVE[w];
  const link = brochureUrl(b.token);
  const open = b.status === "concept" || b.status === "verstuurd";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/brochures" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle brochures
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{b.bedrijf}</h1>
            <span className="apill bg-black/[0.04] font-mono text-black/60">{b.nummer}</span>
            <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
            {b.aantal_bekeken > 0 && (
              <span className="apill bg-black/[0.04] text-black/55" title={b.laatst_bekeken_at ? `Laatst ${momentLang(b.laatst_bekeken_at)}` : undefined}>
                <LuEye className="text-[13px]" /> {b.aantal_bekeken}× bekeken
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={link} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuEye /> Voorbeeld</a>
            <a href={`${link}/pdf?download=1`} className="abtn-ghost !py-1.5 text-[13px]" title="De brochure als pdf, om mee te sturen of te printen"><LuFileDown /> Pdf</a>
            <Link href={`/admin/offertes/nieuw?brochure=${b.id}`} className="abtn-ghost !py-1.5 text-[13px]" title="Een offerte voor deze prospect, met de gegevens al ingevuld"><LuFilePenLine /> Maak offerte</Link>
            {b.status === "ingetrokken" && (
              <form action={heropenBrochure.bind(null, b.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]"><LuRotateCcw /> Heropenen</button>
              </form>
            )}
            {open && (
              <ConfirmButton
                action={trekBrochureIn.bind(null, b.id)}
                message="Brochure intrekken? De prospect ziet daarna alleen nog dat hij niet meer beschikbaar is, met jouw contactgegevens."
                className="abtn-ghost !py-1.5 text-[13px]"
              >
                <LuBan /> Intrekken
              </ConfirmButton>
            )}
            <ConfirmButton action={verwijderBrochure.bind(null, b.id)} message={`Brochure ${b.nummer} definitief verwijderen? De link werkt daarna niet meer.`} className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]">
              <LuTrash2 /> Verwijderen
            </ConfirmButton>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard p-6">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
            {b.status === "verstuurd" ? "Herinnering sturen" : b.status === "concept" ? "Versturen" : "Ingetrokken"}
          </h2>
          {open ? (
            <div className="mt-3">
              <OfferteVersturen
                id={b.id}
                link={link}
                email={b.email}
                aanhef={b.contactpersoon}
                bedrijf={b.bedrijf}
                verstuurd={b.status === "verstuurd"}
                afzenderNaam={b.afzender_naam}
                zelfVersturen={b.status === "concept" ? markeerBrochureVerstuurd.bind(null, b.id) : undefined}
                actie={verstuurBrochure.bind(null, b.id)}
                woord="brochure"
              />
              {b.status === "verstuurd" && (
                <form action={nieuweBrochureLink.bind(null, b.id)} className="mt-3">
                  <button className="text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">
                    <LuLink className="mr-1 inline" /> Link bij de verkeerde terechtgekomen? Maak een nieuwe link
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-black/55">De link toont alleen nog je contactgegevens. Heropen de brochure om hem weer te gebruiken.</p>
          )}
        </section>

        <section className="acard p-6">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat de prospect deed</h2>
          {tijdlijn.length === 0 ? (
            <p className="mt-3 text-[14px] text-black/50">Nog niets.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {tijdlijn.map((g) => {
                const Icoon = ICONEN[g.soort] || LuPencil;
                return (
                  <li key={g.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f9] text-[13px] text-[#312e82]"><Icoon /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] text-[#1c1a4e]">{zin(g)}</span>
                      <span className="block text-[12.5px] text-black/45">{momentLang(g.at)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <BrochureForm begin={b} nieuw={false} />

      <section className="acard p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuStickyNote /> Notitie</h2>
        <p className="mt-1 text-[13px] text-black/50">Alleen voor jullie; de prospect ziet dit niet.</p>
        <form action={saveBrochureNotitie.bind(null, b.id)} className="mt-3 space-y-3">
          <textarea className="ainput min-h-[90px]" name="notitie" defaultValue={b.notitie || ""} maxLength={5000} aria-label="Notitie" />
          <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
        </form>
      </section>
    </div>
  );
}

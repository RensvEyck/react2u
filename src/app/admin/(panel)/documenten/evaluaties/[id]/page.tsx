import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { heropenEvaluatie, markeerEvaluatieVerstuurd, nieuweEvaluatieLink, saveEvaluatieNotitie, trekEvaluatieIn, verstuurEvaluatie, verwijderEvaluatie } from "@/app/admin/evaluatieActions";
import EvaluatieForm from "@/components/admin/EvaluatieForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import OfferteVersturen from "@/components/admin/OfferteVersturen";
import { evaluatieUrl } from "@/lib/mail";
import {
  aandachtspunten, ACTIES, antwoordInfo, CHECKLIST, EVALUATIE_WEERGAVE, evaluatieWeergave, telling, VOLGEND_BEZOEK, VRIJE_VELDEN, type Evaluatie, type EvaluatieGebeurtenis,
} from "@/lib/evaluatie";
import { datumLang, momentLang } from "@/lib/offertes";
import {
  LuArrowLeft, LuEye, LuBan, LuTrash2, LuRotateCcw, LuLink, LuSend, LuBellRing, LuFilePlus, LuPencil, LuStickyNote, LuFileDown, LuPencilLine, LuCircleCheck,
  LuCircleX, LuCircleMinus, LuCalendarCheck, LuClipboardList, LuTriangleAlert,
} from "react-icons/lu";

/**
 * Eén klantevaluatie: versturen of herinneren, de stand bij de klant, wat de
 * klant invulde (de checklist met de aandachtspunten bovenaan, de vrije
 * vakken, het volgende bezoek en de acties), de pdf, de tijdlijn en de
 * gegevens om aan te passen.
 */

const ICONEN: Record<EvaluatieGebeurtenis["soort"], React.ComponentType<{ className?: string }>> = {
  aangemaakt: LuFilePlus, gewijzigd: LuPencil, verstuurd: LuSend, herinnering: LuBellRing, bekeken: LuEye, ingevuld: LuPencilLine, ingetrokken: LuBan, heropend: LuRotateCcw,
};

function zin(g: EvaluatieGebeurtenis): string {
  const d = g.details || {};
  const door = g.door ? ` door ${g.door}` : "";
  switch (g.soort) {
    case "aangemaakt": return `Aangemaakt${door}`;
    case "gewijzigd": return d.link ? `Nieuwe link gemaakt${door}` : `Gewijzigd${door}`;
    case "verstuurd": return d.handmatig ? `Link opengezet${door}, zelf verstuurd` : `Verstuurd naar ${d.aan}${door}`;
    case "herinnering": return `Herinnering naar ${d.aan}${door}`;
    case "bekeken": return "Geopend door de klant";
    case "ingevuld": return `Evaluatie ${d.opnieuw ? "aangepast" : "ingevuld"}${door}`;
    case "ingetrokken": return `Ingetrokken${door}`;
    case "heropend": return `Heropend${door}`;
    default: return g.soort;
  }
}

const ANTWOORD_ICOON = { ja: LuCircleCheck, nee: LuCircleX, nvt: LuCircleMinus } as const;

export default async function EvaluatieAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [res, tijdlijnRes] = await Promise.all([
    sb.from("evaluaties").select("*").eq("id", id).maybeSingle(),
    sb.from("evaluatie_gebeurtenissen").select("*").eq("evaluatie_id", id).order("at", { ascending: false }).limit(200),
  ]);
  if (!res.data) notFound();
  const e = res.data as Evaluatie;
  const tijdlijn = (tijdlijnRes.data as EvaluatieGebeurtenis[]) || [];
  const w = evaluatieWeergave(e);
  const s = EVALUATIE_WEERGAVE[w];
  const link = evaluatieUrl(e.token);
  const basis = `/admin/evaluatievoorbeeld/${e.id}`;
  const open = e.status !== "ingetrokken";
  const a = e.antwoorden;
  const punten = aandachtspunten(a);
  const t = telling(a);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/documenten/evaluaties" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle evaluaties
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{e.bedrijf}</h1>
            <span className="apill bg-black/[0.04] font-mono text-black/60">{e.nummer}</span>
            <span className="apill" style={{ background: s.achter, color: s.kleur }}>{s.label}</span>
            {e.aantal_bekeken > 0 && (
              <span className="apill bg-black/[0.04] text-black/55" title={e.laatst_bekeken_at ? `Laatst ${momentLang(e.laatst_bekeken_at)}` : undefined}>
                <LuEye className="text-[13px]" /> {e.aantal_bekeken}× bekeken
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={basis} target="_blank" className="abtn-ghost !py-1.5 text-[13px]" title="Zo ziet de klant de evaluatie, ook als concept"><LuEye /> Voorbeeld</Link>
            <a href={`${basis}/pdf`} target="_blank" rel="noopener" className="abtn-ghost !py-1.5 text-[13px]"><LuFileDown /> Pdf</a>
            {e.status === "ingetrokken" && (
              <form action={heropenEvaluatie.bind(null, e.id)}>
                <button className="abtn-ghost !py-1.5 text-[13px]"><LuRotateCcw /> Heropenen</button>
              </form>
            )}
            {open && (
              <ConfirmButton
                action={trekEvaluatieIn.bind(null, e.id)}
                message="Evaluatie intrekken? De klant ziet daarna alleen nog dat hij niet meer beschikbaar is, met jouw contactgegevens."
                className="abtn-ghost !py-1.5 text-[13px]"
              >
                <LuBan /> Intrekken
              </ConfirmButton>
            )}
            <ConfirmButton action={verwijderEvaluatie.bind(null, e.id)} message={`Evaluatie ${e.nummer} definitief verwijderen, met alles wat de klant invulde? De link werkt daarna niet meer.`} className="abtn-ghost !py-1.5 text-[13px] text-[#b42318]">
              <LuTrash2 /> Verwijderen
            </ConfirmButton>
          </div>
        </div>
      </div>

      {w === "ingevuld" && (
        <div className={`flex items-center gap-4 rounded-[16px] px-5 py-4 ${punten.length ? "bg-[#fff4e5] text-[#7a4a06]" : "bg-[#e3f6ed] text-[#0a7a4b]"}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[20px] ${punten.length ? "text-[#b86e00]" : ""}`}>
            {punten.length ? <LuTriangleAlert /> : <LuCircleCheck />}
          </span>
          <p className="text-[14.5px]">
            <span className="font-bold">Ingevuld {momentLang(e.ingevuld_at)}{e.ingevuld_door ? ` door ${e.ingevuld_door}` : ""}.</span>{" "}
            {punten.length
              ? `${punten.length === 1 ? "Eén aandachtspunt" : `${punten.length} aandachtspunten`} voor het gesprek: ${punten.map((p) => p.naam).join(", ")}.`
              : "Alle punten van de checklist zijn geregeld of niet van toepassing."}{" "}
            <a href="#antwoorden" className="font-bold underline underline-offset-2">Naar de antwoorden</a>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="acard p-6">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">
            {e.status === "concept" ? "Versturen" : e.status === "ingetrokken" ? "Ingetrokken" : "Herinnering sturen"}
          </h2>
          {open ? (
            <div className="mt-3">
              <OfferteVersturen
                id={e.id}
                link={link}
                email={e.email}
                aanhef={e.contactpersoon}
                bedrijf={e.bedrijf}
                verstuurd={e.status !== "concept"}
                afzenderNaam={e.afzender_naam}
                zelfVersturen={e.status === "concept" ? markeerEvaluatieVerstuurd.bind(null, e.id) : undefined}
                actie={verstuurEvaluatie.bind(null, e.id)}
                woord="evaluatie"
              />
              {e.status !== "concept" && (
                <form action={nieuweEvaluatieLink.bind(null, e.id)} className="mt-3">
                  <button className="text-[12.5px] font-semibold text-black/45 hover:text-[#312e82]">
                    <LuLink className="mr-1 inline" /> Link bij de verkeerde terechtgekomen? Maak een nieuwe link
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-black/55">De link toont alleen nog je contactgegevens. Heropen de evaluatie om hem weer te gebruiken.</p>
          )}
        </section>

        <section className="acard p-6">
          <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuCalendarCheck /> Het bezoek</h2>
          <dl className="mt-4 divide-y divide-black/[0.05]">
            <div className="grid grid-cols-[180px_1fr] gap-4 py-2 text-[14px]">
              <dt className="text-black/50">Datum bezoek</dt>
              <dd className="text-[#1c1a4e]">{e.bezoek_datum ? datumLang(e.bezoek_datum) : <span className="text-black/30">Nog geen datum</span>}{e.bezoek_tijd ? `, ${e.bezoek_tijd}` : ""}</dd>
            </div>
            <div className="grid grid-cols-[180px_1fr] gap-4 py-2 text-[14px]">
              <dt className="text-black/50">Contactpersoon</dt>
              <dd className="text-[#1c1a4e]">{e.contactpersoon || <span className="text-black/30">Leeg</span>}{e.email ? ` · ${e.email}` : ""}{e.telefoon ? ` · ${e.telefoon}` : ""}</dd>
            </div>
            <div className="grid grid-cols-[180px_1fr] gap-4 py-2 text-[14px]">
              <dt className="text-black/50">Stand</dt>
              <dd className="text-[#1c1a4e]">
                {e.ingevuld_at
                  ? `Ingevuld ${momentLang(e.ingevuld_at)}${e.ingevuld_door ? ` door ${e.ingevuld_door}` : ""}`
                  : e.laatst_bekeken_at
                    ? `Geopend, nog niet ingevuld (laatst ${momentLang(e.laatst_bekeken_at)})`
                    : e.verstuurd_at
                      ? `Verstuurd ${momentLang(e.verstuurd_at)}, nog niet geopend`
                      : "Nog niet verstuurd"}
              </dd>
            </div>
            {a && (
              <div className="grid grid-cols-[180px_1fr] gap-4 py-2 text-[14px]">
                <dt className="text-black/50">Checklist</dt>
                <dd className="flex flex-wrap gap-1.5">
                  <span className="apill bg-[#e3f6ed] text-[#0a7a4b]">{t.ja} geregeld</span>
                  <span className="apill bg-[#fdecea] text-[#b42318]">{t.nee} nog niet</span>
                  <span className="apill bg-[#ecebf5] text-[#6b6985]">{t.nvt} n.v.t.</span>
                </dd>
              </div>
            )}
          </dl>
          {a?.volgend_bezoek && (
            <p className="mt-3 rounded-[12px] bg-[#f6f5fb] px-4 py-3 text-[13.5px] text-[#1c1a4e]">
              <span className="font-semibold">{VOLGEND_BEZOEK.datum}:</span> {a.volgend_bezoek.datum ? datumLang(a.volgend_bezoek.datum) : "nog open"}
              {a.volgend_bezoek.tijd ? `, ${a.volgend_bezoek.tijd}` : ""}{a.volgend_bezoek.tot ? ` ${VOLGEND_BEZOEK.tot} ${a.volgend_bezoek.tot}` : ""}
            </p>
          )}
        </section>
      </div>

      <section id="antwoorden" className="acard scroll-mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuClipboardList /> Wat de klant invulde</h2>
          {a && <a href={`${basis}/pdf?download=1`} className="abtn-ghost !py-1.5 text-[13px]"><LuFileDown /> Download als pdf</a>}
        </div>
        {!a ? (
          <p className="mt-3 text-[14px] text-black/50">
            {e.status === "concept" ? "Nog niet verstuurd. De klant vult de evaluatie in via zijn eigen link." : "Nog niet ingevuld door de klant."}
          </p>
        ) : (
          <div className="mt-5 space-y-8">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Checklist</p>
              <ul className="mt-3 divide-y divide-black/[0.05]">
                {CHECKLIST.map((p) => {
                  const r = a.checklist[p.sleutel];
                  const info = r ? antwoordInfo(r.antwoord) : null;
                  const Icoon = r ? ANTWOORD_ICOON[r.antwoord] : LuCircleMinus;
                  return (
                    <li key={p.sleutel} className="flex items-start gap-3 py-3">
                      <Icoon className="mt-0.5 shrink-0 text-[18px]" style={{ color: info?.kleur || "rgba(0,0,0,0.2)" }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#1c1a4e]">{p.naam}</span>
                          {info ? <span className="apill !py-0.5 text-[12px]" style={{ background: info.achter, color: info.kleur }}>{info.label}</span> : <span className="text-[12.5px] text-black/35">geen antwoord</span>}
                        </div>
                        {r?.toelichting && <p className="mt-1 whitespace-pre-line text-[13.5px] text-black/65">{r.toelichting}</p>}
                        {p.vragen?.map((v) => (
                          <p key={v.naam} className="mt-1 text-[13.5px] text-black/65">
                            <span className="text-black/45">{v.label}</span> {r?.vragen?.[v.naam] || <span className="text-black/30">Leeg</span>}
                          </p>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {VRIJE_VELDEN.map((v) => (
                <div key={v.sleutel} className="rounded-[14px] bg-[#f6f5fb] p-4">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{v.titel}</p>
                  <p className="mt-2 whitespace-pre-line text-[14px] text-[#1c1a4e]">{a[v.sleutel] || <span className="text-black/30">Leeg</span>}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">{ACTIES.titel}</p>
              {a.acties.length ? (
                <div className="mt-3 overflow-x-auto rounded-[12px] border border-black/[0.06]">
                  <table className="w-full text-[13.5px]">
                    <thead>
                      <tr className="bg-black/[0.02] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-black/45">
                        <th className="px-3 py-2">{ACTIES.kolommen.actie}</th><th className="px-3 py-2">{ACTIES.kolommen.door}</th><th className="px-3 py-2">{ACTIES.kolommen.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.acties.map((r, i) => (
                        <tr key={i} className="border-t border-black/[0.05]">
                          <td className="px-3 py-2 font-semibold text-[#1c1a4e]">{r.actie}</td>
                          <td className="px-3 py-2 text-black/60">{r.door}</td>
                          <td className="px-3 py-2 text-black/60">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-black/50">Geen acties ingevuld.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="acard p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Wat er gebeurde</h2>
        {tijdlijn.length === 0 ? (
          <p className="mt-3 text-[14px] text-black/50">Nog niets.</p>
        ) : (
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
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

      <EvaluatieForm begin={e} nieuw={false} />

      <section className="acard p-6">
        <h2 className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuStickyNote /> Notitie</h2>
        <p className="mt-1 text-[13px] text-black/50">Alleen voor jullie; de klant ziet dit niet.</p>
        <form action={saveEvaluatieNotitie.bind(null, e.id)} className="mt-3 space-y-3">
          <textarea className="ainput min-h-[90px]" name="notitie" defaultValue={e.notitie || ""} maxLength={5000} aria-label="Notitie" />
          <button className="abtn-ghost !py-1.5 text-[13px]">Notitie opslaan</button>
        </form>
      </section>
    </div>
  );
}

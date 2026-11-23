import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuMessageCircle, LuPencilLine, LuSend, LuSettings2, LuThumbsUp, LuTrash2 } from "react-icons/lu";
import { requirePerm } from "@/lib/admin";
import { datumOver } from "@/lib/offertes";
import { bronTekst, IDEE_STATUS, magStemmen, magWijzigen, MAX_REACTIE, MAX_REDEN, naamVan, NIETS_MEDISCH_BORD, statusInfo, toonTekst, wanneer, zichtbaarVoor, type Kijker } from "@/lib/ideeen";
import { haalIdee } from "@/lib/ideeenDb";
import { inMijnReact2u } from "@/lib/weergave";
import { ideeVerwijderen, ideeWijzigen, reactiePlaatsen, reactieWeg, statusZetten, stemZetten } from "@/app/admin/ideeenActions";
import { Avatar } from "@/components/admin/AccountMenu";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { IdeeVelden, SoortPil, StatusPad, StatusPil, VertrouwelijkPil } from "@/components/admin/ideeen/IdeeBits";
import StemKnop from "@/components/admin/ideeen/StemKnop";

const MOMENT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/**
 * Eén idee (0055): de tekst, waar het staat en wat het beheer erbij schreef,
 * de stemmen en de reacties. De inbrenger past het aan zolang het op ingediend
 * staat; het beheer zet de status met een reden.
 */
export default async function IdeeKaartPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, admin } = await requirePerm("ideeen");
  const mijn = await inMijnReact2u(admin.permissions);
  const kijker: Kijker = { userId: admin.userId, beheer: admin.permissions.includes("omzet") && !mijn };
  const vandaag = datumOver(0);
  const uit = await haalIdee(sb, id, admin.userId);
  if (!uit.ok) return <p className="acard px-6 py-5 text-[14px] text-black/55">Dit idee kon niet geladen worden.</p>;
  if (!uit.data || !zichtbaarVoor(uit.data.idee, kijker)) notFound();
  const { idee, reacties } = uit.data;
  const eigen = idee.door === admin.userId;
  const status = statusInfo(idee.status);
  const bron = bronTekst(idee);
  const tekst = toonTekst(idee);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ideeen" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-black/45 hover:text-[#312e82]"><LuArrowLeft /> Ideeënbord</Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <SoortPil soort={idee.soort} />
          <StatusPil status={idee.status} />
          {idee.vertrouwelijk && <VertrouwelijkPil />}
          {eigen && <span className="apill !py-0 bg-[#fdecf4] text-[11px] text-[#c2185b]">jouw idee</span>}
        </div>
        <h1 className="mt-2 font-heading text-[26px] font-bold leading-tight text-[#312e82]">{idee.titel}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-black/50">
          <Avatar email={idee.door_email || "?"} className="h-6 w-6 text-[11px]" />
          <span><span className="font-semibold text-black/65">{eigen ? "Jij" : naamVan(idee.door_email)}</span> · {wanneer(idee.created_at, vandaag)}{bron ? ` · ${bron}` : ""}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {/* ---------- de tekst ---------- */}
          {tekst && (
            <section className="acard p-6" aria-label="Het idee">
              <p className="whitespace-pre-line text-[15.5px] leading-[1.7] text-[#1c1a4e]" id="idee-tekst">{tekst}</p>
            </section>
          )}

          {/* ---------- waar het staat ---------- */}
          <section className="acard p-6" id="stand" aria-labelledby="stand-kop">
            <h2 id="stand-kop" className="font-heading text-[16px] font-bold text-[#312e82]">Wat ermee gebeurt</h2>
            <div className="mt-3"><StatusPad status={idee.status} /></div>
            <p className="mt-3 text-[13.5px] text-black/55">{status.uitleg}</p>
            {idee.reden && (
              <blockquote className="mt-4 rounded-2xl border-l-[3px] border-l-[#312e82] bg-[#fbfaff] px-5 py-4" id="reden">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#312e82]">Het beheer schreef erbij</p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] leading-[1.6] text-[#1c1a4e]">{idee.reden}</p>
                {idee.status_at && <p className="mt-2 text-[12px] text-black/40">{MOMENT.format(new Date(idee.status_at))}</p>}
              </blockquote>
            )}
          </section>

          {/* ---------- reacties ---------- */}
          <section className="acard overflow-hidden" id="reacties" aria-labelledby="reacties-kop">
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4">
              <h2 id="reacties-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]">
                <LuMessageCircle /> Reacties
                <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#312e82]">{reacties.length}</span>
              </h2>
            </div>
            {reacties.length === 0 ? (
              <p className="px-6 py-5 text-[13.5px] text-black/45">Nog geen reacties. Wat vind jij ervan?</p>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {reacties.map((r) => {
                  const vanMij = r.user_id === admin.userId;
                  return (
                    <li key={r.id} className="flex items-start gap-3 px-6 py-4" data-reactie={r.tekst}>
                      <Avatar email={r.door_email || "?"} className="mt-0.5 h-8 w-8 text-[13px]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-black/45"><span className="font-semibold text-black/65">{vanMij ? "Jij" : naamVan(r.door_email)}</span> · {wanneer(r.created_at, vandaag)}</p>
                        <p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-[1.6] text-[#1c1a4e]">{r.tekst}</p>
                      </div>
                      {(vanMij || kijker.beheer) && (
                        <ConfirmButton action={reactieWeg.bind(null, r.id, idee.id)} message="Deze reactie verwijderen?" className="rounded-lg p-1.5 text-black/30 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                          <LuTrash2 aria-hidden /><span className="sr-only">Reactie verwijderen</span>
                        </ConfirmButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={reactiePlaatsen} className="space-y-3 border-t border-black/[0.06] bg-[#fbfaff] px-6 py-5" id="reageren">
              <input type="hidden" name="idee_id" value={idee.id} />
              <label htmlFor="reactie-tekst" className="alabel">Reageren</label>
              <textarea id="reactie-tekst" name="tekst" required rows={2} maxLength={MAX_REACTIE} placeholder={eigen ? "Een aanvulling op je idee" : "Kort: wat vind je ervan, of wat zou je toevoegen?"} className="ainput resize-y" />
              <div className="flex flex-wrap items-center gap-3">
                <button className="abtn !py-2 text-[13.5px]"><LuSend /> Plaatsen</button>
                <p className="text-[12.5px] text-black/45">{eigen ? NIETS_MEDISCH_BORD : `${naamVan(idee.door_email)} krijgt een bericht van je reactie. ${NIETS_MEDISCH_BORD}`}</p>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          {/* ---------- stemmen ---------- */}
          <section className="acard p-6" id="stemmen" aria-labelledby="stemmen-kop">
            <h2 id="stemmen-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuThumbsUp /> Stemmen</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <StemKnop aantal={idee.stemmen} mijn={idee.mijnStem} mag={magStemmen(idee, kijker)} zet={stemZetten.bind(null, idee.id)} groot />
              <p className="text-[13.5px] text-black/55" data-stemmen-tekst>
                {idee.stemmen === 0 ? "Nog geen stemmen." : idee.stemmen === 1 ? "Eén collega vindt dit een goed idee." : `${idee.stemmen} collega's vinden dit een goed idee.`}
                {eigen ? " Op je eigen idee stem je niet." : magStemmen(idee, kijker) ? (idee.mijnStem ? " Jij stemde; klik nog eens om in te trekken." : " Eén stem per collega, intrekken kan altijd.") : " Dit idee is afgerond."}
              </p>
            </div>
          </section>

          {/* ---------- status zetten (beheer) ---------- */}
          {kijker.beheer && (
            <section className="acard p-6" id="status" aria-labelledby="status-kop">
              <h2 id="status-kop" className="flex items-center gap-2 font-heading text-[16px] font-bold text-[#312e82]"><LuSettings2 /> Status zetten</h2>
              <p className="mt-0.5 text-[12.5px] text-black/45">{eigen ? "Dit is je eigen idee; je krijgt er geen bericht van." : `${naamVan(idee.door_email)} krijgt een bericht op het dashboard en per mail.`}</p>
              <form action={statusZetten} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={idee.id} />
                <fieldset className="space-y-1.5">
                  <legend className="sr-only">Status</legend>
                  {IDEE_STATUS.map((s) => (
                    <label key={s.key} className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 has-[:checked]:bg-[#f6f5fb]">
                      <input type="radio" name="status" value={s.key} defaultChecked={idee.status === s.key} className="mt-1 h-4 w-4 shrink-0 accent-[#312e82]" />
                      <span>
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1c1a4e]"><span className={`h-2 w-2 rounded-full ${s.stip}`} aria-hidden /> {s.label}</span>
                        <span className="block text-[12.5px] text-black/45">{s.uitleg}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div>
                  <label htmlFor="status-reden" className="alabel">Wat gebeurt ermee, of waarom niet</label>
                  <textarea id="status-reden" name="reden" rows={3} maxLength={MAX_REDEN} defaultValue={idee.reden ?? ""} placeholder="De collega leest dit op het bord en in de mail. Bij Niet nu is een reden verplicht." className="ainput resize-y" />
                </div>
                <button className="abtn !py-2 text-[13.5px]">Status zetten</button>
              </form>
            </section>
          )}

          {/* ---------- aanpassen en weghalen ---------- */}
          {magWijzigen(idee, kijker) && (
            <section className="acard p-6" id="wijzigen" aria-labelledby="wijzigen-kop">
              <details className="group/wijzig">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-[16px] font-bold text-[#312e82] [&::-webkit-details-marker]:hidden" id="wijzigen-kop">
                  <LuPencilLine /> Aanpassen
                </summary>
                <form action={ideeWijzigen} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={idee.id} />
                  <IdeeVelden idee={idee} prefix="wijzig" />
                  <button className="abtn-ghost !py-2 text-[13.5px]">Bewaren</button>
                </form>
              </details>
              {!kijker.beheer && <p className="mt-3 text-[12.5px] text-black/40">Aanpassen kan zolang het beheer het nog niet bekeken heeft.</p>}
              <div className="mt-4 border-t border-black/[0.06] pt-4">
                <ConfirmButton action={ideeVerwijderen.bind(null, idee.id)} message={`"${idee.titel}" van het bord halen, met de stemmen en reacties?`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#e0356b] hover:underline">
                  <LuTrash2 aria-hidden /> Van het bord halen
                </ConfirmButton>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

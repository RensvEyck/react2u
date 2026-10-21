import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { deletePartner, deletePartnerKlant, savePartner, savePartnerKlant, setPartnerActief } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import KopieerLink from "@/components/admin/KopieerLink";
import Uitklap from "@/components/admin/Uitklap";
import { siteUrl } from "@/lib/invite";
import {
  aanmeldlink, euroCent, kwartaalLabel, kwartaalOverzicht, kwartaalVan, laatsteKwartalen,
} from "@/lib/partners";
import type { Partner, PartnerKlant } from "@/lib/types";
import { LuArrowLeft, LuMail, LuPlus, LuTrash2, LuInbox, LuPower } from "react-icons/lu";

/**
 * Eén partner: de aanmeldlink om door te sturen, de vergoeding per kwartaal
 * (de laatste vier), de klanten die via dit kantoor kwamen, de aanvragen via
 * de link en de gegevens. Rekenregels in lib/partners.ts.
 */

const datum = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

function KlantVelden({ k }: { k?: PartnerKlant }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label className="alabel">Bedrijf *</label>
        <input className="ainput" name="bedrijf" required defaultValue={k?.bedrijf} />
      </div>
      <div>
        <label className="alabel">Medewerkers *</label>
        <input className="ainput" name="medewerkers" inputMode="numeric" required defaultValue={k?.medewerkers} />
      </div>
      <div>
        <label className="alabel">Abonnement p.p.p.j. (€) *</label>
        <input className="ainput" name="tarief" inputMode="decimal" required defaultValue={k ? String(k.tarief).replace(".", ",") : "38,50"} />
      </div>
      <div>
        <label className="alabel">Klant sinds *</label>
        <input className="ainput" name="start" type="date" required defaultValue={k?.start ?? new Date().toISOString().slice(0, 10)} />
      </div>
      <div>
        <label className="alabel">Laatste dag als klant</label>
        <input className="ainput" name="eind" type="date" defaultValue={k?.eind ?? ""} />
      </div>
      <div className="md:col-span-2 lg:col-span-4">
        <label className="alabel">Notitie</label>
        <input className="ainput" name="notitie" defaultValue={k?.notitie ?? ""} />
      </div>
    </div>
  );
}

export default async function PartnerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requirePerm("bellijst");
  const [partnerRes, klantenRes, berichtenRes] = await Promise.all([
    sb.from("partners").select("*").eq("id", id).maybeSingle(),
    sb.from("partner_klanten").select("*").eq("partner_id", id).order("start", { ascending: false }),
    sb.from("contact_messages").select("id, name, subject, created_at").eq("partner_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  const p = partnerRes.data as Partner | null;
  if (!p) notFound();

  const klanten = (klantenRes.data as PartnerKlant[]) || [];
  const berichten = (berichtenRes.data as { id: string; name: string; subject: string | null; created_at: string }[]) || [];
  const pct = { jaarEen: Number(p.pct_jaar_een), vervolg: Number(p.pct_vervolg) };
  const kwartalen = laatsteKwartalen(4, kwartaalVan(new Date())).map((k) => ({ k, ...kwartaalOverzicht(klanten, pct, k) }));
  const link = aanmeldlink(siteUrl(), p.code);
  const mailBody =
    `Beste ${p.naam || "partner"},\n\nWelkom in het partnerprogramma van React2u. Met deze link meld je een klant bij ons aan:\n\n${link}\n\n` +
    `Een aanvraag via deze link komt bij ons binnen met jouw naam erbij. Je krijgt een kopie van de offerte en elk kwartaal een overzicht met je vergoeding.\n\nMet vriendelijke groet,\nReact2u`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/partners" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle partners
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{p.kantoor}</h1>
            <span className="apill bg-[#eef0ff] font-mono text-[#312e82]">{p.code}</span>
            <span className="apill bg-black/[0.04] text-black/55">
              {p.model === "reseller" ? "Resellerpartner" : `Aanbrengpartner · ${pct.jaarEen}% / ${pct.vervolg}%`}
            </span>
            {!p.actief && <span className="apill bg-[#fff4e5] text-[#c77700]">Inactief</span>}
          </div>
          <form action={setPartnerActief.bind(null, p.id, !p.actief)}>
            <button className="abtn-ghost !py-1.5 text-[13px]">
              <LuPower className="text-[13px]" /> {p.actief ? "Op inactief zetten" : "Weer actief maken"}
            </button>
          </form>
        </div>
      </div>

      {/* Aanmeldlink */}
      <section className="acard space-y-3 p-6">
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Aanmeldlink</h2>
        <p className="text-[14px] text-black/55">
          Stuur deze link naar de partner. Een offerteaanvraag via deze link krijgt in het Postvak IN het label
          &ldquo;Via {p.kantoor}&rdquo;{p.actief ? "." : ". Zolang de partner inactief is, wordt er niets gekoppeld."}
        </p>
        <KopieerLink link={link} label={`Aanmeldlink van ${p.kantoor}`} />
        {p.email && (
          <a href={`mailto:${p.email}?subject=${encodeURIComponent("Je aanmeldlink voor het partnerprogramma van React2u")}&body=${encodeURIComponent(mailBody)}`}
            className="abtn-ghost inline-flex !py-1.5 text-[13px]">
            <LuMail className="text-[13px]" /> Mail de link naar {p.email}
          </a>
        )}
      </section>

      {/* Kwartaaloverzicht */}
      <section className="acard overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Vergoeding per kwartaal</h2>
          <p className="text-[13px] text-black/45">
            Per begonnen maand als klant een twaalfde van het jaarabonnement, de eerste twaalf maanden tegen {pct.jaarEen}%, daarna tegen {pct.vervolg}%.
            Een indicatie op de contractgegevens; de overeenkomst rekent met wat de klant werkelijk betaalde.
          </p>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {kwartalen.map(({ k, totaal, regels }, i) => (
            <li key={kwartaalLabel(k)}>
              <details className="group" open={i === 0 && regels.length > 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-3.5">
                  <span className="font-semibold text-[#1c1a4e]">
                    {kwartaalLabel(k)}{i === 0 && <span className="ml-2 text-[12.5px] font-normal text-black/40">lopend</span>}
                  </span>
                  <span className="flex items-center gap-4 text-[14px]">
                    <span className="text-black/45">{regels.length} klant{regels.length === 1 ? "" : "en"}</span>
                    <strong className="tabular-nums text-[#1c1a4e]">{euroCent(totaal)}</strong>
                  </span>
                </summary>
                {regels.length > 0 && (
                  <div className="overflow-x-auto px-6 pb-4">
                    <table className="w-full min-w-[520px] text-[13.5px]">
                      <tbody className="divide-y divide-black/[0.04]">
                        {regels.map((r) => (
                          <tr key={r.klant.id}>
                            <td className="py-2 text-[#1c1a4e]">{r.klant.bedrijf}</td>
                            <td className="py-2 text-black/50">{r.klant.medewerkers} medewerkers × {euroCent(Number(r.klant.tarief))}</td>
                            <td className="py-2 text-black/50">{r.maanden} maand{r.maanden === 1 ? "" : "en"}</td>
                            <td className="py-2 text-right tabular-nums text-[#1c1a4e]">{euroCent(r.bedrag)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* Klanten */}
      <section id="klanten" className="acard scroll-mt-24 overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Klanten via {p.kantoor}</h2>
          <p className="text-[13px] text-black/45">Werkgevers die via deze partner klant werden, met hun abonnement. Hier rekent het kwartaaloverzicht mee.</p>
        </div>
        {klanten.length === 0 ? (
          <p className="px-6 py-6 text-[14px] text-black/45">Nog geen klanten. Tekent een werkgever via deze partner, voeg hem dan hieronder toe.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {klanten.map((k) => (
              <li key={k.id} className="px-6 py-3.5">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="font-semibold text-[#1c1a4e]">
                      {k.bedrijf}
                      {k.eind && <span className="ml-2 text-[12.5px] font-normal text-black/40">tot {datum(k.eind)}</span>}
                    </span>
                    <span className="text-[13.5px] text-black/50">
                      {k.medewerkers} medewerkers × {euroCent(Number(k.tarief))} · sinds {datum(k.start)} · {euroCent(k.medewerkers * Number(k.tarief))} per jaar
                    </span>
                  </summary>
                  <form action={savePartnerKlant.bind(null, p.id)} className="mt-4 rounded-xl bg-black/[0.02] p-4">
                    <input type="hidden" name="klant" value={k.id} />
                    <KlantVelden k={k} />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <ConfirmButton action={deletePartnerKlant.bind(null, p.id, k.id)}
                        message={`${k.bedrijf} weghalen bij ${p.kantoor}? Het kwartaaloverzicht rekent dan zonder deze klant.`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-black/45 hover:bg-[#fdeef4] hover:text-[#e0356b]">
                        <LuTrash2 className="text-[13px]" /> Weghalen
                      </ConfirmButton>
                      <button className="abtn">Opslaan</button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Uitklap id="klant-nieuw" label="Klant toevoegen">
        <form action={savePartnerKlant.bind(null, p.id)}>
          <KlantVelden />
          <div className="mt-5 flex justify-end">
            <button className="abtn"><LuPlus /> Toevoegen</button>
          </div>
        </form>
      </Uitklap>

      {/* Aanvragen via de link */}
      <section className="acard overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Aanvragen via de aanmeldlink</h2>
        </div>
        {berichten.length === 0 ? (
          <p className="px-6 py-6 text-[14px] text-black/45">Nog geen aanvragen via deze link.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {berichten.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                <span className="min-w-0">
                  <span className="font-semibold text-[#1c1a4e]">{b.subject || "(geen onderwerp)"}</span>
                  <span className="block text-[12.5px] text-black/45">{b.name} · {new Date(b.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span>
                </span>
                <Link href={`/admin/postvak-in#bericht-${b.id}`} className="abtn-ghost !py-1.5 text-[13px]">
                  <LuInbox className="text-[13px]" /> In Postvak IN
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gegevens */}
      <section className="acard p-6">
        <h2 className="mb-4 font-heading text-[16px] font-bold text-[#312e82]">Gegevens</h2>
        <form action={savePartner}>
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="alabel">Kantoor *</label>
              <input className="ainput" name="kantoor" required defaultValue={p.kantoor} />
            </div>
            <div>
              <label className="alabel">Contactpersoon</label>
              <input className="ainput" name="naam" defaultValue={p.naam ?? ""} />
            </div>
            <div>
              <label className="alabel">Partnercode</label>
              <input className="ainput font-mono uppercase" name="code" maxLength={20} defaultValue={p.code} />
              <span className="mt-1 block text-[12px] text-black/40">Wijzig je de code, dan werkt de oude link niet meer.</span>
            </div>
            <div>
              <label className="alabel">E-mail</label>
              <input className="ainput" name="email" type="email" defaultValue={p.email ?? ""} />
            </div>
            <div>
              <label className="alabel">Telefoon</label>
              <input className="ainput" name="telefoon" type="tel" defaultValue={p.telefoon ?? ""} />
            </div>
            <div>
              <label className="alabel">Model</label>
              <select className="ainput" name="model" defaultValue={p.model}>
                <option value="aanbreng">Aanbrengpartner</option>
                <option value="reseller">Resellerpartner</option>
              </select>
            </div>
            <div>
              <label className="alabel">Vergoeding jaar één (%)</label>
              <input className="ainput" name="pct_jaar_een" inputMode="decimal" defaultValue={String(p.pct_jaar_een).replace(".", ",")} />
            </div>
            <div>
              <label className="alabel">Vergoeding daarna (%)</label>
              <input className="ainput" name="pct_vervolg" inputMode="decimal" defaultValue={String(p.pct_vervolg).replace(".", ",")} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="alabel">Notitie</label>
              <textarea className="ainput min-h-[80px]" name="notitie" defaultValue={p.notitie ?? ""} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <ConfirmButton action={deletePartner.bind(null, p.id)}
              message={`${p.kantoor} verwijderen? Dat kan alleen zonder klanten; anders zet je hem op inactief.`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-black/45 hover:bg-[#fdeef4] hover:text-[#e0356b]">
              <LuTrash2 className="text-[13px]" /> Partner verwijderen
            </ConfirmButton>
            <button className="abtn">Opslaan</button>
          </div>
        </form>
      </section>
    </div>
  );
}

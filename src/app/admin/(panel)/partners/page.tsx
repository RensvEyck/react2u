import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { savePartner } from "@/app/admin/actions";
import Uitklap from "@/components/admin/Uitklap";
import { isMissingTable } from "@/lib/dbErrors";
import { euroCent, kwartaalLabel, kwartaalOverzicht, kwartaalVan, laatsteKwartalen, type PartnerKlantRij } from "@/lib/partners";
import type { Partner } from "@/lib/types";
import { LuPlus, LuDatabase, LuHandshake, LuChevronRight } from "react-icons/lu";

/**
 * Partners (migratie 0022): wie er meedoet, hoeveel aanvragen en klanten via
 * elk kantoor kwamen, en de vergoeding van dit en het vorige kwartaal. De
 * details, de aanmeldlink en de klanten staan per partner op /admin/partners/[id].
 */
export default async function PartnersAdmin() {
  const { sb } = await requirePerm("bellijst");
  const [partnersRes, klantenRes, berichtenRes] = await Promise.all([
    sb.from("partners").select("*").order("kantoor"),
    sb.from("partner_klanten").select("id, partner_id, bedrijf, medewerkers, tarief, start, eind"),
    sb.from("contact_messages").select("partner_id").not("partner_id", "is", null),
  ]);
  if (isMissingTable(partnersRes.error)) return <SetupNeeded />;

  const partners = (partnersRes.data as Partner[]) || [];
  const klanten = (klantenRes.data as (PartnerKlantRij & { partner_id: string })[]) || [];
  const aanvragen = new Map<string, number>();
  for (const r of (berichtenRes.data as { partner_id: string }[]) || []) {
    aanvragen.set(r.partner_id, (aanvragen.get(r.partner_id) || 0) + 1);
  }
  const [nu, vorig] = laatsteKwartalen(2, kwartaalVan(new Date()));
  const vandaag = new Date().toISOString().slice(0, 10);

  const rijen = partners.map((p) => {
    const eigen = klanten.filter((k) => k.partner_id === p.id);
    const pct = { jaarEen: Number(p.pct_jaar_een), vervolg: Number(p.pct_vervolg) };
    return {
      p,
      aanvragen: aanvragen.get(p.id) || 0,
      klanten: eigen.filter((k) => !k.eind || k.eind >= vandaag).length,
      nu: kwartaalOverzicht(eigen, pct, nu).totaal,
      vorig: kwartaalOverzicht(eigen, pct, vorig).totaal,
    };
  });
  const totaalNu = rijen.reduce((s, r) => s + r.nu, 0);
  const totaalVorig = rijen.reduce((s, r) => s + r.vorig, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Partners</h1>
        <p className="text-[14.5px] text-black/50">
          Kantoren die werkgevers bij ons onderbrengen. Elke partner heeft een eigen aanmeldlink; aanvragen via die link
          krijgen in het Postvak IN het label van de partner.
        </p>
      </div>

      <Uitklap id="nieuw" label="Partner toevoegen">
        <form action={savePartner}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="alabel">Kantoor *</label>
              <input className="ainput" name="kantoor" required />
            </div>
            <div>
              <label className="alabel">Contactpersoon</label>
              <input className="ainput" name="naam" />
            </div>
            <div>
              <label className="alabel">Partnercode</label>
              <input className="ainput font-mono uppercase" name="code" maxLength={20} placeholder="Leeg: uit de naam van het kantoor" />
            </div>
            <div>
              <label className="alabel">E-mail</label>
              <input className="ainput" name="email" type="email" />
            </div>
            <div>
              <label className="alabel">Telefoon</label>
              <input className="ainput" name="telefoon" type="tel" />
            </div>
            <div>
              <label className="alabel">Model</label>
              <select className="ainput" name="model" defaultValue="aanbreng">
                <option value="aanbreng">Aanbrengpartner</option>
                <option value="reseller">Resellerpartner</option>
              </select>
            </div>
            <div>
              <label className="alabel">Vergoeding jaar één (%)</label>
              <input className="ainput" name="pct_jaar_een" inputMode="decimal" defaultValue="50" />
            </div>
            <div>
              <label className="alabel">Vergoeding daarna (%)</label>
              <input className="ainput" name="pct_vervolg" inputMode="decimal" defaultValue="25" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="abtn"><LuPlus /> Toevoegen</button>
          </div>
        </form>
      </Uitklap>

      <section className="acard overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Alle partners</h2>
          {rijen.length > 0 && (
            <p className="text-[13px] text-black/45">
              Vergoeding {kwartaalLabel(nu)}: <strong className="text-[#1c1a4e]">{euroCent(totaalNu)}</strong>
              {" · "}{kwartaalLabel(vorig)}: <strong className="text-[#1c1a4e]">{euroCent(totaalVorig)}</strong>
            </p>
          )}
        </div>
        {rijen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <LuHandshake className="text-[26px] text-black/25" />
            <p className="text-[14px] text-black/45">Nog geen partners. Voeg er hierboven een toe; hij krijgt meteen een aanmeldlink.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead className="text-[12px] uppercase tracking-[0.06em] text-black/40">
                <tr className="border-b border-black/[0.06]">
                  <th className="px-6 py-3 font-semibold">Kantoor</th>
                  <th className="px-3 py-3 font-semibold">Code</th>
                  <th className="px-3 py-3 font-semibold">Model</th>
                  <th className="px-3 py-3 text-right font-semibold">Aanvragen</th>
                  <th className="px-3 py-3 text-right font-semibold">Klanten</th>
                  <th className="px-3 py-3 text-right font-semibold">{kwartaalLabel(nu)}</th>
                  <th className="px-3 py-3 text-right font-semibold">{kwartaalLabel(vorig)}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {rijen.map(({ p, aanvragen, klanten, nu: bedragNu, vorig: bedragVorig }) => (
                  <tr key={p.id} className={p.actief ? "" : "opacity-55"}>
                    <td className="px-6 py-3.5">
                      <Link href={`/admin/partners/${p.id}`} className="font-semibold text-[#1c1a4e] hover:underline">{p.kantoor}</Link>
                      {!p.actief && <span className="apill ml-2 bg-black/[0.05] !text-[11.5px] text-black/50">Inactief</span>}
                      {p.naam && <span className="block text-[12.5px] text-black/45">{p.naam}</span>}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[13px] text-black/60">{p.code}</td>
                    <td className="px-3 py-3.5 text-black/60">{p.model === "reseller" ? "Reseller" : "Aanbreng"}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{aanvragen}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{klanten}</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[#1c1a4e]">{euroCent(bedragNu)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-black/60">{euroCent(bedragVorig)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <Link href={`/admin/partners/${p.id}`} aria-label={`${p.kantoor} openen`} className="inline-flex text-black/35 hover:text-[#312e82]">
                        <LuChevronRight className="text-[18px]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-[13px] text-black/45">
        De vergoeding is een indicatie op de contractgegevens van de klanten (medewerkers, abonnement, looptijd). De
        partnerovereenkomst rekent met wat de klant werkelijk betaalde.
      </p>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Partners</h1>
        <p className="text-[14.5px] text-black/50">Kantoren die werkgevers bij ons onderbrengen.</p>
      </div>
      <div className="acard flex items-start gap-4 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]">
          <LuDatabase />
        </span>
        <div>
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Nog één stap: de database bijwerken</h2>
          <p className="mt-1 text-[14px] text-black/55">
            Partners hebben twee nieuwe tabellen nodig. Voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0022_partners.sql</code>{" "}
            uit in Supabase. Tot die tijd werkt de site gewoon; aanvragen via een aanmeldlink krijgen dan alleen de code in
            de tekst.
          </p>
        </div>
      </div>
    </div>
  );
}

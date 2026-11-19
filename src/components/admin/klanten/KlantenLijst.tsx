"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuChevronDown, LuChevronUp, LuChevronRight, LuMail, LuPhone, LuSearch, LuUsers } from "react-icons/lu";
import { isKlantStatus, KLANT_STATUS, relatief, type Klant, type KlantStatus } from "@/lib/klanten";
import { noteerBel } from "@/lib/belAfloop";
import { filterKlantenlijst, sorteerKlantenlijst, stamkaartVolledigheid, type LijstSortering } from "@/lib/stamkaart";
import { Eigenaar, StatusPill } from "@/components/admin/klantenbord/bits";

/**
 * De klantenlijst: zoeken, een kolom van het bord als filter, inactief op
 * verzoek, sorteren per kolom. Een rij opent de stamkaart. Het aantal staat
 * naast het zoekveld, zoals op het bord.
 */
export default function KlantenLijst({ klanten, vandaag, beginQ, beginStatus }: { klanten: Klant[]; vandaag: string; beginQ: string; beginStatus: string }) {
  const router = useRouter();
  const [q, setQ] = useState(beginQ);
  const [status, setStatus] = useState<KlantStatus | "alle">(isKlantStatus(beginStatus) ? beginStatus : "alle");
  const [inactief, setInactief] = useState(beginStatus === "inactief");
  const [sorteer, setSorteer] = useState<LijstSortering>("bedrijf");
  const [oplopend, setOplopend] = useState(true);

  // De zoekvraag en het filter in de URL, zodat een link naar de lijst hetzelfde toont; `null` als state, anders ziet Next hem niet.
  const zetUrl = (nq: string, ns: KlantStatus | "alle") => {
    const url = new URL(window.location.href);
    if (nq.trim()) url.searchParams.set("q", nq.trim());
    else url.searchParams.delete("q");
    if (ns !== "alle") url.searchParams.set("status", ns);
    else url.searchParams.delete("status");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };

  const telling = useMemo(() => {
    const t: Record<KlantStatus, number> = { lead: 0, gesprek: 0, offerte: 0, akkoord: 0, inrichten: 0, klant: 0, inactief: 0 };
    for (const k of klanten) t[k.status]++;
    return t;
  }, [klanten]);
  const actief = klanten.length - telling.inactief;

  const rijen = useMemo(() => sorteerKlantenlijst(filterKlantenlijst(klanten, { q, status, inactief }), sorteer, oplopend), [klanten, q, status, inactief, sorteer, oplopend]);
  const gefilterd = Boolean(q.trim()) || status !== "alle";

  const kop = (key: LijstSortering, label: string, extra = "") => {
    const aan = sorteer === key;
    return (
      <th className={`px-4 py-3 ${extra}`} aria-sort={aan ? (oplopend ? "ascending" : "descending") : undefined}>
        <button
          type="button"
          onClick={() => {
            if (aan) setOplopend(!oplopend);
            else {
              setSorteer(key);
              setOplopend(key !== "laatste" && key !== "volledig");
            }
          }}
          className={`inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-bold uppercase tracking-[0.08em] ${aan ? "text-[#312e82]" : "text-black/45 hover:text-[#312e82]"}`}
        >
          {label}
          {aan && (oplopend ? <LuChevronUp className="text-[12px]" /> : <LuChevronDown className="text-[12px]" />)}
        </button>
      </th>
    );
  };

  return (
    <section className="acard overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-4 py-3 sm:px-6">
        <label className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-black/35" />
          <input
            id="kl-zoek"
            className="ainput !py-2 !pl-9 !text-[14px]"
            value={q}
            onChange={(e) => { setQ(e.target.value); zetUrl(e.target.value, status); }}
            placeholder="Zoek op bedrijf, naam, plaats, KvK of telefoon"
            aria-label="Zoek in de klantenlijst"
          />
        </label>
        <nav className="flex flex-wrap gap-1.5" aria-label="Status">
          {([["alle", "Alle", actief], ...KLANT_STATUS.filter((s) => s.key !== "inactief").map((s) => [s.key, s.label, telling[s.key]] as const)] as [KlantStatus | "alle", string, number][]).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setStatus(key); zetUrl(q, key); }}
              aria-pressed={status === key}
              className={`apill !py-1.5 text-[13px] ${status === key ? "bg-[#312e82] text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}
            >
              {label}
              <span className={status === key ? "text-white/70" : "text-black/35"}>{n}</span>
            </button>
          ))}
          <label className={`apill cursor-pointer !py-1.5 text-[13px] ${status === "inactief" || inactief ? "bg-black/[0.08] text-[#1c1a4e]" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"}`}>
            <input
              type="checkbox"
              className="accent-[#312e82]"
              checked={status === "inactief" || inactief}
              onChange={(e) => {
                if (status === "inactief") { setStatus("alle"); setInactief(false); zetUrl(q, "alle"); }
                else setInactief(e.target.checked);
              }}
            />
            Ook inactief <span className="text-black/35">{telling.inactief}</span>
          </label>
        </nav>
        <span className="ml-auto text-[12.5px] text-black/45" aria-live="polite">
          {gefilterd ? `${rijen.length} van ${klanten.length}` : `${rijen.length} ${rijen.length === 1 ? "klant" : "klanten"}`}
        </span>
      </div>

      {rijen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]"><LuUsers /></span>
          <p className="text-[15px] font-semibold text-[#1c1a4e]">{klanten.length === 0 ? "Nog geen klanten op het bord" : "Niets gevonden met deze zoekvraag of dit filter"}</p>
          {klanten.length === 0 && <p className="max-w-[420px] text-[13.5px] text-black/50">Zet je eerste lead op het klantenbord of importeer je klantlijst; elke kaart krijgt hier een stamkaart.</p>}
        </div>
      ) : (
        // `relative`: wat er absoluut in staat blijft binnen de rij, zodat de pagina op een telefoon niet breder wordt dan het scherm.
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1040px] text-[13.5px]">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                {kop("bedrijf", "Bedrijf", "min-w-[260px] pl-6")}
                {kop("status", "Status")}
                {kop("contact", "Contactpersoon")}
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">Telefoon</th>
                <th className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-black/45">E-mail</th>
                {kop("casemanager", "Bij React2u")}
                {kop("laatste", "Laatste activiteit")}
                {kop("volledig", "Stamkaart")}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rijen.map((k) => {
                const v = stamkaartVolledigheid(k);
                const plaats = k.bezoek_plaats || k.post_plaats;
                return (
                  <tr
                    key={k.id}
                    data-klant={k.id}
                    onClick={() => router.push(`/admin/klanten/${k.id}`)}
                    className="cursor-pointer border-b border-black/[0.05] align-top last:border-b-0 hover:bg-[#f7f7fc]"
                  >
                    <td className="px-4 py-3 pl-6">
                      <Link href={`/admin/klanten/${k.id}`} onClick={(e) => e.stopPropagation()} className="block font-semibold text-[#1c1a4e] hover:text-[#312e82] hover:underline">{k.bedrijf}</Link>
                      {(plaats || k.kvk) && (
                        <span className="mt-0.5 block text-[12.5px] text-black/45">{[plaats, k.kvk ? `KvK ${k.kvk}` : ""].filter(Boolean).join(" · ")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={k.status} klein /></td>
                    <td className="px-4 py-3 text-black/70">
                      {k.contactpersoon ? <span className="block">{k.contactpersoon}</span> : <span className="text-black/30">–</span>}
                      {k.contact_functie && <span className="block text-[12.5px] text-black/45">{k.contact_functie}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {k.telefoon ? (
                        <a href={`tel:${k.telefoon.replace(/\s/g, "")}`} onClick={(e) => { e.stopPropagation(); noteerBel({ id: k.id, bedrijf: k.bedrijf, naam: k.contactpersoon }); }} className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#e75387] hover:underline">
                          <LuPhone className="text-[12px]" />{k.telefoon}
                        </a>
                      ) : <span className="text-black/30">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      {k.email ? (
                        <a href={`mailto:${k.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex max-w-[220px] items-center gap-1.5 text-[#e75387] hover:underline">
                          <LuMail className="shrink-0 text-[12px]" /><span className="truncate">{k.email}</span>
                        </a>
                      ) : <span className="text-black/30">–</span>}
                    </td>
                    <td className="px-4 py-3 text-black/70">
                      <span className="flex items-center gap-2">
                        <Eigenaar naam={k.casemanager || k.eigenaar} />
                        <span className="min-w-0">
                          {k.casemanager ? <span className="block truncate">{k.casemanager}</span> : k.eigenaar ? <span className="block truncate">{k.eigenaar}</span> : <span className="text-black/30">–</span>}
                          {k.casemanager && k.eigenaar && k.eigenaar !== k.casemanager && <span className="block truncate text-[12px] text-black/45">sales: {k.eigenaar}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-black/60">
                      {k.laatste_contact_op ? (
                        <>
                          <span className="block text-[12.5px] font-semibold text-black/45">{relatief(k.laatste_contact_op, vandaag)}</span>
                          <span className="block max-w-[240px] truncate" title={k.laatste_contact || ""}>{k.laatste_contact}</span>
                        </>
                      ) : (
                        <span className="block text-[12.5px] text-black/40">bijgewerkt {relatief(k.updated_at.slice(0, 10), vandaag)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2" title={v.ontbreekt.length ? `Ontbreekt: ${v.ontbreekt.join(", ")}` : "Stamkaart compleet"}>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${(v.ingevuld / v.totaal) * 100}%`, background: v.ingevuld === v.totaal ? "#0a7a4b" : v.ingevuld >= v.totaal / 2 ? "#b86e00" : "#e0356b" }} />
                        </span>
                        <span className="text-[12px] tabular-nums text-black/50">{v.ingevuld}/{v.totaal}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex text-black/30"><LuChevronRight className="text-[18px]" /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

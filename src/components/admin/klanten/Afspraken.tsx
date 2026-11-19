"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuPencil, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { datumLang } from "@/lib/offertes";
import { MERKEN } from "@/lib/offerteMerk";
import { PERIODE_LABEL, TARIEF_EENHEDEN, TARIEF_LABELS, tariefGeldt, tariefPeriode, tariefTekst, type KlantTarief, type TariefInvoer } from "@/lib/stamkaart";
import { bewaarTarief, verwijderTarief } from "@/app/admin/stamkaartActions";

/**
 * De afwijkende tariefafspraken (klant_tarieven, 0048): een lijst met per
 * regel het label, de omschrijving, het bedrag met eenheid en de looptijd, en
 * een formulier om er een bij te zetten of te wijzigen.
 */

type Form = { label: string; omschrijving: string; bedrag: string; eenheid: string; ingangsdatum: string; einddatum: string; notitie: string };
const LEEG: Form = { label: "", omschrijving: "", bedrag: "", eenheid: "uur", ingangsdatum: "", einddatum: "", notitie: "" };

export default function Afspraken({ klantId, tarieven, vandaag }: { klantId: string; tarieven: KlantTarief[]; vandaag: string }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [open, setOpen] = useState<"nieuw" | string | null>(null);
  const [form, setForm] = useState<Form>(LEEG);
  const [fout, setFout] = useState<string | null>(null);

  const zet = (veld: keyof Form, w: string) => setForm((f) => ({ ...f, [veld]: w }));
  const begin = (t?: KlantTarief) => {
    setFout(null);
    setForm(t ? { label: t.label || "", omschrijving: t.omschrijving, bedrag: t.bedrag === null ? "" : String(t.bedrag).replace(".", ","), eenheid: t.eenheid, ingangsdatum: t.ingangsdatum || "", einddatum: t.einddatum || "", notitie: t.notitie || "" } : { ...LEEG, ingangsdatum: vandaag });
    setOpen(t ? t.id : "nieuw");
  };

  const bewaar = () => {
    setFout(null);
    const invoer: TariefInvoer = { ...form, label: form.label || null, bedrag: form.bedrag || null, ingangsdatum: form.ingangsdatum || null, einddatum: form.einddatum || null, notitie: form.notitie || null };
    start(async () => {
      const r = await bewaarTarief(klantId, invoer, open === "nieuw" ? null : open);
      if (!r.ok) return setFout(r.fout);
      setOpen(null);
      router.refresh();
    });
  };

  const weg = (t: KlantTarief) => {
    if (!window.confirm(`"${t.omschrijving}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    start(async () => {
      const r = await verwijderTarief(klantId, t.id);
      if (!r.ok) return setFout(r.fout);
      router.refresh();
    });
  };

  const formulier = (
    <form
      onSubmit={(e) => { e.preventDefault(); bewaar(); }}
      className="grid gap-3 rounded-[14px] border border-[#312e82]/20 bg-[#f7f7fc] p-4 sm:grid-cols-6"
      aria-label={open === "nieuw" ? "Nieuwe afspraak" : "Afspraak wijzigen"}
    >
      <div className="sm:col-span-4">
        <label className="alabel" htmlFor="ta-omschrijving">Omschrijving</label>
        <input id="ta-omschrijving" className="ainput !py-2 !text-[14px]" value={form.omschrijving} onChange={(e) => zet("omschrijving", e.target.value)} placeholder="Bijvoorbeeld: uurtarief bedrijfsarts op locatie" maxLength={300} autoFocus />
      </div>
      <div className="sm:col-span-2">
        <label className="alabel" htmlFor="ta-label">Label</label>
        <select id="ta-label" className="ainput !py-2 !text-[14px]" value={form.label} onChange={(e) => zet("label", e.target.value)}>
          <option value="">Geen label</option>
          {TARIEF_LABELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="alabel" htmlFor="ta-bedrag">Bedrag (excl. btw)</label>
        <input id="ta-bedrag" className="ainput !py-2 !text-[14px]" inputMode="decimal" value={form.bedrag} onChange={(e) => zet("bedrag", e.target.value)} placeholder="95" disabled={form.eenheid === "op_aanvraag"} />
      </div>
      <div className="sm:col-span-2">
        <label className="alabel" htmlFor="ta-eenheid">Eenheid</label>
        <select id="ta-eenheid" className="ainput !py-2 !text-[14px]" value={form.eenheid} onChange={(e) => zet("eenheid", e.target.value)}>
          {TARIEF_EENHEDEN.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </div>
      <div>
        <label className="alabel" htmlFor="ta-van">Vanaf</label>
        <input id="ta-van" type="date" className="ainput !py-2 !text-[14px]" value={form.ingangsdatum} onChange={(e) => zet("ingangsdatum", e.target.value)} />
      </div>
      <div>
        <label className="alabel" htmlFor="ta-tot">Tot en met</label>
        <input id="ta-tot" type="date" className="ainput !py-2 !text-[14px]" value={form.einddatum} onChange={(e) => zet("einddatum", e.target.value)} />
      </div>
      <div className="sm:col-span-6">
        <label className="alabel" htmlFor="ta-notitie">Toelichting (mag leeg)</label>
        <input id="ta-notitie" className="ainput !py-2 !text-[14px]" value={form.notitie} onChange={(e) => zet("notitie", e.target.value)} placeholder="Waarom, met wie afgesproken, waar het in staat" maxLength={1000} />
      </div>
      {fout && <p role="alert" className="text-[13px] font-semibold text-[#e0356b] sm:col-span-6">{fout}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-6">
        <button type="submit" disabled={bezig} className="abtn !py-1.5 text-[13px]">{bezig ? "Opslaan…" : open === "nieuw" ? "Afspraak vastleggen" : "Wijziging opslaan"}</button>
        <button type="button" onClick={() => setOpen(null)} disabled={bezig} className="abtn-ghost !py-1.5 text-[13px]"><LuX /> Annuleren</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-3">
      {fout && open === null && <p role="alert" className="text-[13px] font-semibold text-[#e0356b]">{fout}</p>}
      {tarieven.length > 0 && (
        <ul className="acard divide-y divide-black/[0.05]">
          {tarieven.map((t) => {
            const merk = t.label ? MERKEN[t.label] : null;
            const geldt = tariefGeldt(t, vandaag);
            const periode = tariefPeriode(t);
            return (
              <li key={t.id} className="px-5 py-3" data-tarief={t.id}>
                {open === t.id ? formulier : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        {merk && <span className="apill !px-2 !py-0.5 !text-[11.5px]" style={{ background: merk.tint, color: merk.tekst }}>{merk.naam}</span>}
                        <span className="font-semibold text-[#1c1a4e]">{t.omschrijving}</span>
                        {!geldt && <span className="apill !px-2 !py-0.5 !text-[11.5px] bg-black/[0.06] text-black/50">{t.ingangsdatum && t.ingangsdatum > vandaag ? "nog niet ingegaan" : "verlopen"}</span>}
                      </span>
                      <span className="block text-[12.5px] text-black/45">
                        {t.ingangsdatum ? `vanaf ${datumLang(t.ingangsdatum)}` : "zonder ingangsdatum"}{t.einddatum ? ` tot en met ${datumLang(t.einddatum)}` : ""}{t.notitie ? ` · ${t.notitie}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums text-[#1c1a4e]">{tariefTekst(t)}</span>
                      <span className="apill !px-2 !py-0.5 !text-[11.5px]" style={periode === "abonnement" ? { background: "#eef0ff", color: "#312e82" } : periode === "eenmalig" ? { background: "#fff4e5", color: "#b86e00" } : periode === "bij gebruik" ? { background: "#e6f2ff", color: "#0b6bcb" } : { background: "rgba(13,13,40,0.06)", color: "#6b6a85" }}>{PERIODE_LABEL[periode]}</span>
                      <button type="button" onClick={() => begin(t)} disabled={bezig} className="rounded-md p-1.5 text-black/40 hover:bg-black/[0.05] hover:text-[#312e82]" aria-label={`Wijzig ${t.omschrijving}`}><LuPencil className="text-[14px]" /></button>
                      <button type="button" onClick={() => weg(t)} disabled={bezig} className="rounded-md p-1.5 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]" aria-label={`Verwijder ${t.omschrijving}`}><LuTrash2 className="text-[14px]" /></button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open === "nieuw" ? formulier : (
        <button type="button" onClick={() => begin()} className="abtn-ghost !py-1.5 text-[13px]"><LuPlus /> Afspraak toevoegen</button>
      )}
      {tarieven.length === 0 && open !== "nieuw" && <p className="text-[13px] text-black/45">Nog geen afwijkende afspraken; alles gaat volgens de prijslijst.</p>}
    </div>
  );
}

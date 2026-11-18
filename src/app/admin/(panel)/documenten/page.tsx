import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { isMissingTable } from "@/lib/dbErrors";
import { evaluatieWeergave, type Evaluatie } from "@/lib/evaluatie";
import { momentLang } from "@/lib/offertes";
import { LuArrowRight, LuBookOpen, LuClipboardCheck, LuClipboardList, LuDatabase, LuFilePenLine, LuPlus, LuScrollText } from "react-icons/lu";

/**
 * Documenten (Rens, 17 nov 2026: "misschien moeten we het in de sidebar gewoon
 * documenten noemen"): één ingang voor de losse documenten die de klant via
 * een persoonlijke link online invult, in dezelfde stijl als het contract en
 * de onboarding. Nu de klantevaluatie (0043); een volgend document krijgt hier
 * zijn eigen tegel. De vaste trajecten (offertes, contracten, onboarding,
 * brochures) houden hun eigen ingang; daar staat onderaan een verwijzing naar.
 */

type Rij = Pick<Evaluatie, "id" | "nummer" | "status" | "bedrijf" | "bekeken_at" | "verstuurd_at" | "ingevuld_at" | "created_at">;

export default async function Documenten() {
  const { sb } = await requirePerm("bellijst");
  const { data, error } = await sb.from("evaluaties").select("id, nummer, status, bedrijf, bekeken_at, verstuurd_at, ingevuld_at, created_at").order("created_at", { ascending: false }).limit(500);
  const tabel = !error || !isMissingTable(error);
  const rijen = ((data as Rij[] | null) || []).map((e) => ({ e, w: evaluatieWeergave(e) }));
  const open = rijen.filter(({ w }) => w === "verstuurd" || w === "bekeken");
  const ingevuld = rijen.filter(({ w }) => w === "ingevuld");
  const laatste = rijen.find(({ w }) => w === "ingevuld");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Documenten</h1>
          <p className="text-[14.5px] text-black/50">
            Losse documenten die de klant via een persoonlijke link online invult, in dezelfde stijl als het contract en de onboarding: jij verstuurt, de klant vult in, de pdf en de tijdlijn komen vanzelf.
          </p>
        </div>
      </div>

      {!tabel && (
        <div className="acard flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[18px] text-[#312e82]"><LuDatabase /></span>
          <p className="text-[14px] text-black/55">
            Klantevaluaties staan nog niet aan: voer{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px]">supabase/migrations/0043_klantevaluatie.sql</code> eerst uit in Supabase.
          </p>
        </div>
      )}

      <section aria-labelledby="losse-documenten" className="grid gap-4 md:grid-cols-2">
        <h2 id="losse-documenten" className="sr-only">Losse documenten</h2>
        <article className="acard flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fdecf4] text-[22px] text-[#e61674]"><LuClipboardList /></span>
            <div className="min-w-0">
              <h3 className="font-heading text-[18px] font-bold text-[#1c1a4e]">Klantevaluatie</h3>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-black/55">
                De jaarlijkse evaluatie met een klant: de checklist arbo en verzuim, de evaluatie van de dienstverlening, de wensen voor komend jaar, de afspraken en de acties. Het formulier &quot;Klant Evaluatie&quot;, online.
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            <div className="rounded-[12px] bg-[#f6f5fb] px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">Bij de klant</dt>
              <dd className="mt-0.5 font-heading text-[22px] font-bold leading-none text-[#312e82]">{open.length}</dd>
            </div>
            <div className="rounded-[12px] bg-[#f6f5fb] px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">Ingevuld</dt>
              <dd className="mt-0.5 font-heading text-[22px] font-bold leading-none text-[#0a7a4b]">{ingevuld.length}</dd>
            </div>
            <div className="rounded-[12px] bg-[#f6f5fb] px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/45">Alle</dt>
              <dd className="mt-0.5 font-heading text-[22px] font-bold leading-none text-[#1c1a4e]">{rijen.length}</dd>
            </div>
          </dl>
          {laatste && (
            <p className="text-[13px] text-black/50">
              Laatst ingevuld: <Link href={`/admin/documenten/evaluaties/${laatste.e.id}`} className="font-semibold text-[#312e82] hover:underline">{laatste.e.bedrijf}</Link>
              {laatste.e.ingevuld_at ? ` · ${momentLang(laatste.e.ingevuld_at)}` : ""}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <Link href="/admin/documenten/evaluaties/nieuw" className="abtn"><LuPlus /> Nieuwe evaluatie</Link>
            <Link href="/admin/documenten/evaluaties" className="abtn-ghost">Alle evaluaties <LuArrowRight /></Link>
          </div>
        </article>
        <article className="flex flex-col justify-center gap-3 rounded-[16px] border border-dashed border-black/[0.12] p-6 text-[13.5px] text-black/45">
          <p className="font-semibold text-black/55">Ruimte voor een volgend document</p>
          <p className="leading-[1.55]">
            Een nieuw formulier dat de klant online invult krijgt hier een eigen tegel, met dezelfde bouwstenen: een persoonlijke link, de pagina in de huisstijl, de pdf, de mail en de tijdlijn op het klantenbord.
          </p>
        </article>
      </section>

      <section className="acard p-6" aria-labelledby="vaste-trajecten">
        <h2 id="vaste-trajecten" className="font-heading text-[16px] font-bold text-[#312e82]">De vaste trajecten</h2>
        <p className="mt-1 text-[13.5px] text-black/50">Offertes, contracten, onboarding en brochures hebben hun eigen ingang in het menu.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/offertes" className="apill bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"><LuFilePenLine /> Offertes</Link>
          <Link href="/admin/contracten" className="apill bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"><LuScrollText /> Contracten</Link>
          <Link href="/admin/onboarding" className="apill bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"><LuClipboardCheck /> Onboarding</Link>
          <Link href="/admin/brochures" className="apill bg-black/[0.04] text-black/60 hover:bg-black/[0.07]"><LuBookOpen /> Brochures</Link>
        </div>
      </section>
    </div>
  );
}

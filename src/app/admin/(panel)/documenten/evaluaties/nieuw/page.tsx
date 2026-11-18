import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import EvaluatieForm, { type EvaluatieBegin } from "@/components/admin/EvaluatieForm";
import { standaardAfzender } from "@/lib/offerteBeheer";
import { BERICHT_STANDAARD } from "@/lib/evaluatie";
import type { Klant } from "@/lib/klanten";
import { LuArrowLeft, LuLayoutGrid } from "react-icons/lu";

/**
 * Nieuwe klantevaluatie: voor wie, wanneer het bezoek is, het persoonlijke
 * woord en de afzender. Vanuit een kaart op het klantenbord (?klant=<id>)
 * staan de gegevens van de klant al klaar.
 */
export default async function NieuweEvaluatie({ searchParams }: { searchParams: Promise<{ klant?: string }> }) {
  const { sb, user, admin } = await requirePerm("bellijst");
  const { klant } = await searchParams;
  const [afzender, kaart] = await Promise.all([
    standaardAfzender(sb, user.id, admin.email),
    klant && /^[0-9a-f-]{36}$/.test(klant)
      ? sb.from("klanten").select("bedrijf, contactpersoon, email, telefoon").eq("id", klant).maybeSingle().then((r) => (r.data as Pick<Klant, "bedrijf" | "contactpersoon" | "email" | "telefoon"> | null) ?? null)
      : Promise.resolve(null),
  ]);
  const begin: EvaluatieBegin = {
    ...afzender,
    bericht: BERICHT_STANDAARD,
    ...(kaart ? { bedrijf: kaart.bedrijf, contactpersoon: kaart.contactpersoon, email: kaart.email, telefoon: kaart.telefoon } : {}),
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/documenten/evaluaties" className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-black/50 hover:text-[#312e82]">
          <LuArrowLeft /> Alle evaluaties
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuwe klantevaluatie</h1>
        <p className="text-[14.5px] text-black/50">
          De klant krijgt één persoonlijke pagina met het formulier &quot;Klant Evaluatie&quot;, in de stijl van de site. De vragen liggen vast; jij kiest voor wie, wanneer en met welk woord vooraf.
        </p>
        {kaart && (
          <p className="flex items-center gap-2 text-[14px] text-black/55">
            <LuLayoutGrid className="text-[#312e82]" /> Ingevuld vanuit het klantenbord. Controleer en vul aan.
          </p>
        )}
      </div>
      <EvaluatieForm begin={begin} nieuw />
    </div>
  );
}

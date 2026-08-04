import { requireAdmin } from "@/lib/admin";
import { saveContactSettings } from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";

const input =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-[#e75387]";

const FIELDS: { name: keyof ContactInfo; label: string }[] = [
  { name: "phoneDisplay", label: "Telefoonnummer (weergave)" },
  { name: "phone", label: "Telefoonnummer (voor tel:-links, zonder spaties)" },
  { name: "email", label: "E-mailadres" },
  { name: "addressLine1", label: "Adresregel 1" },
  { name: "addressLine2", label: "Adresregel 2" },
  { name: "kvk", label: "KVK-nummer" },
  { name: "btw", label: "BTW-nummer" },
  { name: "iban", label: "IBAN" },
];

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const { opgeslagen } = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("site_settings").select("value").eq("key", "contact").maybeSingle();
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Instellingen</h1>
      {opgeslagen && (
        <div className="mb-6 rounded-xl bg-[#00aa98]/10 border border-[#00aa98]/30 px-4 py-3 text-[#00806f]">
          Instellingen opgeslagen — de site is bijgewerkt.
        </div>
      )}
      <form action={saveContactSettings} className="rounded-2xl bg-white p-6 shadow-sm max-w-[640px]">
        <h2 className="text-xl font-bold text-[#312e82] mb-4">Contactgegevens (header &amp; footer)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1 block text-sm font-medium text-black/60">{f.label}</span>
              <input className={input} name={f.name} defaultValue={contact[f.name]} />
            </label>
          ))}
        </div>
        <button className="btn mt-6 !py-2.5 !px-6 text-[15px]">Opslaan</button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import {
  saveContactSettings, saveDocumentsSettings, saveCertificatesSettings, saveMaintenanceSettings, saveKoppelingenSettings,
} from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import { normalizeMaintenance, MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";
import { normalizeKoppelingen } from "@/lib/koppelingen";
import ListEditor from "@/components/admin/ListEditor";

const FIELDS: { name: keyof ContactInfo; label: string }[] = [
  { name: "phoneDisplay", label: "Telefoonnummer (weergave)" },
  { name: "phone", label: "Telefoonnummer (tel:-links, zonder spaties)" },
  { name: "email", label: "E-mailadres" },
  { name: "addressLine1", label: "Adresregel 1" },
  { name: "addressLine2", label: "Adresregel 2" },
  { name: "kvk", label: "KVK-nummer" },
  { name: "btw", label: "BTW-nummer" },
  { name: "iban", label: "IBAN" },
];

export default async function SettingsAdmin() {
  const { sb } = await requirePerm("instellingen");
  const [{ data }, { data: docsData }, { data: certsData }, { data: maintenanceData }, { data: koppelingenData }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "documents").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "certificates").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "maintenance").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "koppelingen").maybeSingle(),
  ]);
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  const docs = normalizeDocs(docsData?.value);
  const certificates = normalizeCertificates(certsData?.value);
  const maintenance = normalizeMaintenance(maintenanceData?.value);
  const koppelingen = normalizeKoppelingen(koppelingenData?.value);
  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Instellingen</h1>
        <p className="text-[14.5px] text-black/50">Onderhoudsmodus, de gegevens die site-breed in de header en footer staan, en de koppelingen achter de formulieren.</p>
      </div>

      <form action={saveMaintenanceSettings} id="onderhoud" className="acard scroll-mt-24 p-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Onderhoudsmodus</h2>
          {maintenance.enabled ? (
            <span className="apill bg-[#fff4e5] text-[#c77700]">Aan — site is dicht</span>
          ) : (
            <span className="apill bg-[#e6f7f4] text-[#0e9f8a]">Uit — site is bereikbaar</span>
          )}
        </div>
        <p className="mb-4 text-[13px] text-black/45">
          Staat hij aan, dan zien bezoekers op elke pagina een onderhoudsmelding met jullie telefoonnummer en
          e-mailadres. Zoekmachines krijgen te horen dat het tijdelijk is, dus de site verliest zijn plek in Google
          niet. Ingelogde beheerders zien de site gewoon — controleer het daarom in een privévenster. Het kan tot een
          halve minuut duren voordat de wijziging overal zichtbaar is.
        </p>
        <label className="alabel">Bericht voor bezoekers (optioneel)</label>
        <textarea
          className="ainput"
          name="message"
          rows={3}
          defaultValue={maintenance.message}
          placeholder={MAINTENANCE_DEFAULT_MESSAGE}
        />
        <div className="mt-5 flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-[14px] font-medium text-black/70">
            <input type="checkbox" name="enabled" defaultChecked={maintenance.enabled} className="h-4 w-4 accent-[#e75387]" />
            Website in onderhoud
          </label>
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveContactSettings} className="acard p-6">
        <h2 className="mb-4 font-heading text-[16px] font-bold text-[#312e82]">Contactgegevens</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="alabel">{f.label}</label>
              <input className="ainput" name={f.name} defaultValue={contact[f.name]} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveKoppelingenSettings} id="koppelingen" className="acard scroll-mt-24 p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Koppelingen en reactietermijn</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Wat een bezoeker na het versturen van een formulier ziet en per mail krijgt.
        </p>
        <div className="grid gap-4">
          <div>
            <label className="alabel" htmlFor="kennismaking_url">Link voor kennismaking inplannen</label>
            <input className="ainput" id="kennismaking_url" name="kennismaking_url" type="url" inputMode="url"
              defaultValue={koppelingen.kennismaking_url} placeholder="https://calendly.com/react2u/kennismaking" />
            <p className="mt-1.5 text-[12.5px] text-black/45">
              Ingevuld: na een offerteaanvraag staat op de bedankmelding en in de bevestigingsmail de knop
              &ldquo;Plan direct een kennismaking&rdquo; die deze link opent. Leeg: geen knop.
            </p>
          </div>
          <div className="max-w-[260px]">
            <label className="alabel" htmlFor="sollicitatie_werkdagen">Reactietermijn sollicitaties (werkdagen)</label>
            <input className="ainput" id="sollicitatie_werkdagen" name="sollicitatie_werkdagen" type="number" min={1} max={30}
              defaultValue={koppelingen.sollicitatie_werkdagen} />
            <p className="mt-1.5 text-[12.5px] text-black/45">
              Op de bedankmelding en in de bevestigingsmail: &ldquo;We nemen binnen vijf werkdagen contact met je op.&rdquo;
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveDocumentsSettings} className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Documenten (footer)</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Verschijnen als links onderaan elke pagina. Nieuw PDF? Upload het via{" "}
          <Link href="/admin/media" className="font-semibold text-[#e75387] hover:underline">Media</Link> en kies de URL hier.
        </p>
        <ListEditor
          initial={docs}
          fields={[
            { name: "label", label: "Naam", placeholder: "Algemene voorwaarden" },
            { name: "href", label: "Link naar het document", placeholder: "https://…/document.pdf", media: true },
          ]}
          addLabel="Document toevoegen"
          emptyLabel="Nog geen documenten."
        />
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveCertificatesSettings} className="acard p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Certificaten &amp; keurmerken (footer)</h2>
        <p className="mb-4 text-[13px] text-black/45">
          Logo&apos;s die als rij onderaan elke pagina staan. Upload het logo eerst via{" "}
          <Link href="/admin/media" className="font-semibold text-[#e75387] hover:underline">Media</Link>.
          Het logo moet een afbeelding zijn; een PDF kan een browser niet als plaatje tonen. Zet het certificaat zelf bij <em>Link</em>. Vul je alleen een omschrijving en een link in, dan verschijnt het certificaat als tekstlink in plaats van als logo.
        </p>
        <ListEditor
          initial={certificates}
          fields={[
            { name: "image", label: "Logo (afbeelding — geen PDF)", placeholder: "https://…/logo.png", media: true, preview: true, alleenAfbeeldingen: true },
            { name: "alt", label: "Omschrijving (voor schermlezers)", placeholder: "ISO 9001 gecertificeerd" },
            { name: "href", label: "Link (optioneel) — hier hoort het certificaat als PDF", placeholder: "https://…/certificaat.pdf", media: true },
          ]}
          addLabel="Certificaat toevoegen"
          emptyLabel="Nog geen certificaten."
        />
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}

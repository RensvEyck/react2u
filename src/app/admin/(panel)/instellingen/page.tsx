import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import {
  saveContactSettings, saveDocumentsSettings, saveCertificatesSettings, saveMaintenanceSettings,
  saveTrackingSettings, saveTarievenSettings,
} from "@/app/admin/actions";
import { CONTACT_FALLBACK, type ContactInfo } from "@/lib/content";
import { normalizeDocs, normalizeCertificates } from "@/lib/nav";
import { normalizeMaintenance, MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";
import { normalizeTracking } from "@/lib/tracking";
import { normalizeTarieven } from "@/lib/tarieven";
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
  const [{ data }, { data: docsData }, { data: certsData }, { data: maintenanceData }, { data: trackingData }, { data: tarievenData }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "documents").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "certificates").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "maintenance").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "tracking").maybeSingle(),
    sb.from("site_settings").select("value").eq("key", "tarieven").maybeSingle(),
  ]);
  const contact = { ...CONTACT_FALLBACK, ...((data?.value as Partial<ContactInfo>) || {}) };
  const docs = normalizeDocs(docsData?.value);
  const certificates = normalizeCertificates(certsData?.value);
  const maintenance = normalizeMaintenance(maintenanceData?.value);
  const tracking = normalizeTracking(trackingData?.value);
  const tarieven = normalizeTarieven(tarievenData?.value);
  const ipinfoAan = Boolean(process.env.IPINFO_TOKEN);
  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Instellingen</h1>
        <p className="text-[14.5px] text-black/50">Onderhoudsmodus, privacy, tarievenjaar, en de gegevens die site-breed in de header en footer staan.</p>
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

      <form action={saveTrackingSettings} id="privacy" className="acard scroll-mt-24 p-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-heading text-[16px] font-bold text-[#312e82]">Bedrijfsherkenning en privacy</h2>
          {tracking.bedrijfsherkenning === "altijd" ? (
            <span className="apill bg-[#fff4e5] text-[#c77700]">Gerechtvaardigd belang</span>
          ) : (
            <span className="apill bg-[#e6f7f4] text-[#0e9f8a]">Alleen na toestemming</span>
          )}
        </div>
        <p className="mb-4 text-[13px] text-black/45">
          Om een bezoek vanaf een bedrijfsnetwerk tot dat bedrijf te herleiden gaat het IP-adres naar ipinfo.io.
          Daar is een grondslag voor nodig. Bezoek tellen gebeurt altijd, zonder cookies en zonder IP-adres.
          {!ipinfoAan && <> Op dit moment staat <code className="font-mono">IPINFO_TOKEN</code> niet in Vercel; herkenning werkt dan alleen via het eigen domein van een bedrijf (reverse DNS).</>}
        </p>
        <div className="grid gap-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] p-4 has-[:checked]:border-[#312e82] has-[:checked]:bg-[#fafafd]">
            <input type="radio" name="bedrijfsherkenning" value="toestemming" defaultChecked={tracking.bedrijfsherkenning === "toestemming"} className="mt-1 accent-[#312e82]" />
            <span className="text-[14px] text-black/75">
              <strong className="block text-[#1c1a4e]">Alleen na toestemming (standaard)</strong>
              De cookiemelding vraagt om &ldquo;Statistiek&rdquo;. Zonder vinkje wordt het bezoek geteld zonder bedrijf en gaat het IP-adres nergens heen. Veilig, maar je ziet minder bedrijven.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] p-4 has-[:checked]:border-[#312e82] has-[:checked]:bg-[#fafafd]">
            <input type="radio" name="bedrijfsherkenning" value="altijd" defaultChecked={tracking.bedrijfsherkenning === "altijd"} className="mt-1 accent-[#312e82]" />
            <span className="text-[14px] text-black/75">
              <strong className="block text-[#1c1a4e]">Altijd, op grond van gerechtvaardigd belang</strong>
              Herkenning staat aan tenzij een bezoeker &ldquo;Statistiek&rdquo; uitzet. Kies dit alleen als de privacyverklaring (PDF) de afweging bevat: welk belang, dat alleen de organisatie wordt vastgelegd en nooit een persoon, dat het IP-adres niet wordt bewaard, en hoe iemand bezwaar maakt. Een voorstel voor die tekst staat in CONTEXT.md onder <em>Bewaartermijnen en privacy</em>.
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="abtn">Opslaan</button>
        </div>
      </form>

      <form action={saveTarievenSettings} id="tarieven" className="acard scroll-mt-24 p-6">
        <h2 className="mb-1 font-heading text-[16px] font-bold text-[#312e82]">Tarievenjaar</h2>
        <p className="mb-4 text-[13px] text-black/45">
          De tariefblokken op de site (Verzuimabonnementen, Werkgevers) zetten dit jaar in hun bovenkopje en tonen de geldigheid eronder.
          Per 1 januari hoef je hier alleen het jaar aan te passen en in de blokken de bedragen. Leeg laten betekent: het huidige kalenderjaar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="alabel">Jaar</label>
            <input className="ainput" name="jaar" inputMode="numeric" pattern="20[0-9]{2}" defaultValue={tarieven.jaar} />
          </div>
          <div>
            <label className="alabel">Geldig tot en met</label>
            <input className="ainput" name="geldigTot" defaultValue={tarieven.geldigTot} placeholder={`31 december ${tarieven.jaar}`} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
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

import "server-only";
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ContactInfo } from "./content";
import type { Certificate } from "./nav";
import { PdfKeurmerken } from "./pdfKeurmerken";
import {
  actieSleutel, CHECKLIST_KOLOMMEN, CHECKLIST_KOP, CHECKLIST_NAAM, CHECKLIST_ONDERTITEL, CHECKLIST_TITEL, CHECKLIST_VRAGEN, checklistVoortgang, datumSleutel,
  type ChecklistData, type ChecklistStand,
} from "./contractChecklist";
import { datumLang, momentLang } from "./offertes";
import { Logo, registreer } from "./offertePdf";

/*
 * De Checklist arbeidsomstandigheden als pdf (migratie 0042): hetzelfde rustige
 * document als de contract-pdf (lib/contractPdf.tsx), met het briefhoofd en de
 * voet van het contract, en de opbouw van het Word-bestand: de vijf vakken
 * bovenaan, en de tabel met de drie kolommen en de acht onderdelen.
 * Ingevuld: de antwoorden van de klant in de vakken, met wie en wanneer. Leeg:
 * open vakken om met de hand in te vullen, en de link om het online te doen.
 */


const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";
const VAKLIJN = "#D9D4CA";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.3, color: BODY, paddingTop: 44, paddingBottom: 64, paddingHorizontal: 50, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 50, right: 50, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 8, lineHeight: 1.3 },
  // Met `top`: een Text met `render` die met `bottom` staat, tekent react-pdf (4.9) niet (zie offertePdf).
  paginanummer: { position: "absolute", top: 806, left: 50, right: 50, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE },
  vet: { fontWeight: 600, color: INKT },
  kolomkop: { fontSize: 8, fontWeight: 600, color: INKT, letterSpacing: 0.3, textTransform: "uppercase" },
  cel: { paddingVertical: 7, paddingHorizontal: 8 },
});

export type ChecklistPdfInvoer = {
  contract: { nummer: string; bedrijf: string; opdrachtgever?: { naam?: string } | null };
  stand: ChecklistStand | null;
  contact: ContactInfo;
  /** De certificaten uit Instellingen, voor de keurmerken in de voet (lib/keurmerken.ts). */
  certificaten: Certificate[];
  /** De persoonlijke link naar de checklist, waar dezelfde antwoorden online staan. */
  link: string;
};

function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, KvK {contact.kvk}, btw {contact.btw}</Text>
      </View>
      <Text style={s.paginanummer} fixed render={({ pageNumber, totalPages }) => `Checklist ${nummer}, pagina ${pageNumber} van ${totalPages}`} />
    </>
  );
}

/** Een vak bovenaan: het label en de waarde, of een open vak om te schrijven. */
function Vak({ label, waarde, leeg }: { label: string; waarde?: string; leeg: boolean }) {
  return (
    <View style={{ width: "48.5%", marginBottom: 8 }}>
      <Text style={{ fontSize: 8.5, fontWeight: 600, color: MUTE, marginBottom: 3 }}>{label}</Text>
      <View style={{ minHeight: leeg ? 24 : 20, borderRadius: 6, borderWidth: 0.7, borderColor: waarde ? LIJN : VAKLIJN, backgroundColor: waarde ? ZACHT : "#FFFFFF", paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center" }}>
        {waarde ? <Text style={{ fontSize: 10, color: INKT }}>{waarde}</Text> : null}
      </View>
    </View>
  );
}

function Kop({ data, leeg }: { data: ChecklistData; leeg: boolean }) {
  const waarde = (naam: string) => (naam === "datum" && data.datum ? datumLang(data.datum) : data[naam]);
  // In de volgorde van het Word-bestand: links plaats en datum, rechts bedrijf, naam en functie.
  const links = CHECKLIST_KOP.filter((v) => ["plaats", "datum"].includes(v.naam));
  const rechts = CHECKLIST_KOP.filter((v) => !["plaats", "datum"].includes(v.naam));
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }} wrap={false}>
      <View style={{ width: "48.5%" }}>
        {links.map((v) => (
          <View key={v.naam} style={{ width: "100%" }}><Vak label={v.label} waarde={waarde(v.naam)} leeg={leeg} /></View>
        ))}
      </View>
      <View style={{ width: "48.5%" }}>
        {rechts.map((v) => (
          <View key={v.naam} style={{ width: "100%" }}><Vak label={v.label} waarde={waarde(v.naam)} leeg={leeg} /></View>
        ))}
      </View>
    </View>
  );
}

/**
 * De tabel: de drie kolommen en de acht onderdelen, elk onbreekbaar op de
 * pagina. Geen omhullend kader: dat loopt bij een paginagrens door tot
 * onderaan de pagina. Elke rij draagt zijn eigen randen; de kop de bovenkant.
 */
function Tabel({ data, leeg }: { data: ChecklistData; leeg: boolean }) {
  const breedtes = { vraag: 1.25, actie: 1.45, datum: 78 };
  const rand = { borderLeftWidth: 0.7, borderRightWidth: 0.7, borderBottomWidth: 0.7, borderColor: LIJN };
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: "row", backgroundColor: ZACHT, borderWidth: 0.7, borderColor: LIJN, borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
        <Text style={[s.kolomkop, s.cel, { flex: breedtes.vraag }]}>{CHECKLIST_KOLOMMEN[0]}</Text>
        <Text style={[s.kolomkop, s.cel, { flex: breedtes.actie, borderLeftWidth: 0.7, borderLeftColor: LIJN }]}>{CHECKLIST_KOLOMMEN[1]}</Text>
        <Text style={[s.kolomkop, s.cel, { width: breedtes.datum, borderLeftWidth: 0.7, borderLeftColor: LIJN }]}>{CHECKLIST_KOLOMMEN[2]}</Text>
      </View>
      {CHECKLIST_VRAGEN.map((q, i) => {
        const actie = data[actieSleutel(q.id)];
        const datum = data[datumSleutel(q.id)];
        const laatste = i === CHECKLIST_VRAGEN.length - 1;
        return (
          <View key={q.id} style={{ flexDirection: "row", ...rand, ...(laatste ? { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 } : {}), minHeight: leeg ? 64 : 34 }} wrap={false}>
            <View style={[s.cel, { flex: breedtes.vraag, flexDirection: "row" }]}>
              <Text style={{ width: 14, fontSize: 8.5, fontWeight: 600, color: ROZE }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                {q.alineas.map((a, j) => <Text key={j} style={{ fontSize: 9, color: INKT, lineHeight: 1.45, marginBottom: j < q.alineas.length - 1 ? 4 : 0 }}>{a}</Text>)}
              </View>
            </View>
            <View style={[s.cel, { flex: breedtes.actie, borderLeftWidth: 0.7, borderLeftColor: LIJN }]}>
              {q.toelichting && <Text style={{ fontSize: 8.5, color: MUTE, lineHeight: 1.45, marginBottom: actie ? 4 : 0 }}>{q.toelichting}</Text>}
              {actie && <Text style={{ fontSize: 9, color: INKT, lineHeight: 1.45 }}>{actie}</Text>}
            </View>
            <View style={[s.cel, { width: breedtes.datum, borderLeftWidth: 0.7, borderLeftColor: LIJN }]}>
              {datum && <Text style={{ fontSize: 9, color: INKT, lineHeight: 1.45 }}>{datumLang(datum)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ChecklistDocument({ contract, stand, contact, certificaten, link }: ChecklistPdfInvoer) {
  const data = stand?.data || {};
  const leeg = !stand;
  const klant = contract.opdrachtgever?.naam || contract.bedrijf;
  const v = checklistVoortgang(data);
  return (
    <Document
      title={`${CHECKLIST_NAAM} bij contract ${contract.nummer} ${contract.bedrijf}${leeg ? "" : " (ingevuld)"}`}
      author="React2u"
      subject={CHECKLIST_TITEL}
      keywords={`checklist, arbeidsomstandigheden, basiscontract, ${leeg ? "in te vullen" : "ingevuld"}`}
      creator="React2u"
      producer="React2u"
      language="nl-NL"
    >
      <Page size="A4" style={s.pagina}>
        <Voet contact={contact} nummer={contract.nummer} />

        {/* Briefhoofd, zoals op het contract */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Logo />
            <View style={{ width: 0.6, height: 34, backgroundColor: LIJN, marginHorizontal: 14 }} />
            <Text style={{ fontSize: 9.5, color: BODY, lineHeight: 1.35 }}>Jouw mensen,{"\n"}<Text style={s.vet}>onze aandacht.</Text></Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: ROZE }}>Gecertificeerde arbodienst</Text>
            <Text style={{ fontSize: 10, fontWeight: 600, color: INKT, marginTop: 2, lineHeight: 1.3 }}>Contract {contract.nummer}</Text>
          </View>
        </View>

        {/* Omslag */}
        <View style={{ paddingTop: 26 }}>
          <Text style={[s.label, { color: ROZE }]}>{CHECKLIST_ONDERTITEL} bij het basiscontract</Text>
          <Text style={{ fontSize: 24, fontWeight: 600, color: INKT, letterSpacing: -0.5, lineHeight: 1.12, marginTop: 3 }}>{CHECKLIST_TITEL}</Text>
          <Text style={{ fontSize: 12, color: BODY, marginTop: 6, lineHeight: 1.3 }}>
            tussen <Text style={s.vet}>React2u</Text> en <Text style={s.vet}>{klant}</Text>
          </Text>
          {leeg ? (
            <View style={{ marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 9.5, color: INKT }}>
                <Text style={{ fontWeight: 600 }}>Nog in te vullen.</Text> Online via de persoonlijke link van het contract, of met de hand op dit formulier.
                Je kunt tussendoor opslaan en later aanvullen; de datums van afronding komen vaak later.
              </Text>
              <Link src={link} style={{ fontSize: 8, color: NAVY, marginTop: 2 }}>{link}</Link>
            </View>
          ) : (
            <View style={{ marginTop: 16, backgroundColor: "#E5F6F4", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 9.5, color: "#0B5F5A" }}>
                <Text style={{ fontWeight: 600 }}>Online ingevuld</Text> op {momentLang(stand.ingevuld_at)}{stand.door ? ` door ${stand.door}` : ""}
                {stand.versie > 1 ? `, bijgewerkt op ${momentLang(stand.bijgewerkt_at)}` : ""}. {v.beantwoord} van {v.totaal} onderdelen beantwoord.
              </Text>
            </View>
          )}
        </View>

        <Kop data={data} leeg={leeg} />
        <Tabel data={data} leeg={leeg} />

        <View style={{ marginTop: 14 }} wrap={false}>
          <Text style={{ fontSize: 8.5, color: MUTE, lineHeight: 1.45 }}>
            Deze checklist hoort bij het Basiscontract Arbodienstverlening (contract {contract.nummer}) tussen React2u en {klant}. De antwoorden staan ook op de persoonlijke
            contractpagina; daar kun je ze aanvullen.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 16 }}>
            <PdfKeurmerken certificaten={certificaten} kleur={MUTE} />
            <Link src={link} style={{ fontSize: 7.5, color: MUTE, flex: 1, textAlign: "right" }}>{link}</Link>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** De pdf als buffer, voor de downloadroutes en als bijlage bij de mails. */
export async function contractChecklistPdf(invoer: ChecklistPdfInvoer): Promise<Buffer> {
  registreer();
  return renderToBuffer(<ChecklistDocument {...invoer} />);
}

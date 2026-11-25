import "server-only";
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ContactInfo } from "./content";
import { CHECKLIST_AANTAL, CHECKLIST_GENUMMERD, CHECKLIST_ONDERTITEL, CHECKLIST_TITEL } from "./checklistPoortwachter";
import { Logo, registreer } from "./offertePdf";

/*
 * De checklist poortwachterdossier als pdf (/kennis/checklist-poortwachterdossier):
 * hetzelfde rustige document als de andere pdf's (briefhoofd, Outfit, de voet
 * met de contactgegevens), met per fase de punten en een vakje om af te
 * vinken. Eén document voor iedereen; de inhoud komt uit
 * lib/checklistPoortwachter.ts, dezelfde lijst als op de pagina.
 */

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.3, color: BODY, paddingTop: 44, paddingBottom: 64, paddingHorizontal: 50, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 50, right: 50, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 8, lineHeight: 1.3 },
  paginanummer: { position: "absolute", top: 806, left: 50, right: 50, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  vet: { fontWeight: 600, color: INKT },
  vakje: { width: 11, height: 11, borderWidth: 0.9, borderColor: NAVY, borderRadius: 2.5, marginRight: 8, marginTop: 1.5 },
});

export type ChecklistPdfInvoer = { contact: ContactInfo; site: string };

function Voet({ contact }: { contact: ContactInfo }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, {contact.phoneDisplay}, {contact.email}, KvK {contact.kvk}</Text>
      </View>
      <Text style={s.paginanummer} fixed render={({ pageNumber, totalPages }) => `${CHECKLIST_TITEL}, pagina ${pageNumber} van ${totalPages}`} />
    </>
  );
}

function ChecklistDocument({ contact, site }: ChecklistPdfInvoer) {
  const gids = `${site}/wet-verbetering-poortwachter`;
  const planner = `${site}/kennis/poortwachter-planner`;
  return (
    <Document title={CHECKLIST_TITEL} author="React2u" subject={CHECKLIST_ONDERTITEL} keywords="checklist, poortwachter, re-integratieverslag, UWV, WIA" creator="React2u" producer="React2u" language="nl-NL">
      <Page size="A4" style={s.pagina}>
        <Voet contact={contact} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Logo />
            <View style={{ width: 0.6, height: 34, backgroundColor: LIJN, marginHorizontal: 14 }} />
            <Text style={{ fontSize: 9.5, color: BODY, lineHeight: 1.35 }}>Jouw mensen,{"\n"}<Text style={s.vet}>onze aandacht.</Text></Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: ROZE }}>Gecertificeerde arbodienst</Text>
            <Text style={{ fontSize: 8.5, color: MUTE, marginTop: 2 }}>Kennisbank, november 2026</Text>
          </View>
        </View>

        <View style={{ paddingTop: 26 }}>
          <Text style={{ fontSize: 8.5, fontWeight: 600, color: ROZE }}>Wet verbetering poortwachter</Text>
          <Text style={{ fontSize: 24, fontWeight: 600, color: INKT, letterSpacing: -0.5, lineHeight: 1.12, marginTop: 3 }}>{CHECKLIST_TITEL}</Text>
          <Text style={{ fontSize: 12, color: BODY, marginTop: 6, lineHeight: 1.3 }}>{CHECKLIST_ONDERTITEL}</Text>
          <View style={{ marginTop: 14, backgroundColor: ZACHT, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 9.5, color: INKT, lineHeight: 1.5 }}>
              Bij de WIA-aanvraag beoordeelt UWV het re-integratieverslag: alles wat jij en je werknemer in twee jaar hebben gedaan. Ontbreekt er iets,
              dan kan een loonsanctie volgen van maximaal 52 weken. Deze {CHECKLIST_AANTAL} punten zijn wat UWV verwacht, per fase. Vink af wat in het dossier zit;
              wat ontbreekt, herstel je alsnog en dateer je eerlijk.
            </Text>
          </View>
        </View>

        {CHECKLIST_GENUMMERD.map((fase, fi) => (
          <View key={fase.titel} style={{ marginTop: fi === 0 ? 18 : 14 }} wrap={false}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", borderBottomWidth: 0.7, borderBottomColor: LIJN, paddingBottom: 5, marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: INKT }}>{fase.titel}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 600, color: ROZE }}>{fase.periode}</Text>
            </View>
            {fase.punten.map((p) => (
              <View key={p.tekst} style={{ flexDirection: "row", paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: "#F3F0EA" }}>
                <View style={s.vakje} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5, color: INKT, lineHeight: 1.4 }}><Text style={{ color: MUTE }}>{p.nummer}. </Text>{p.tekst}</Text>
                  {p.toelichting && <Text style={{ fontSize: 8.3, color: MUTE, lineHeight: 1.4 }}>{p.toelichting}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={{ marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }} wrap={false}>
          <Text style={{ fontSize: 9.5, color: INKT, lineHeight: 1.5 }}>
            <Text style={{ fontWeight: 600 }}>Alle datums in één keer in je agenda?</Text> De Poortwachter-planner rekent ze uit vanaf de eerste ziektedag.
          </Text>
          <Link src={planner} style={{ fontSize: 8.5, color: NAVY, marginTop: 2 }}>{planner}</Link>
          <Text style={{ fontSize: 9, color: BODY, lineHeight: 1.5, marginTop: 6 }}>
            De uitleg bij elke stap staat in de gids over de Wet verbetering poortwachter. Twijfel je over een dossier? Bel {contact.phoneDisplay}: we kijken mee, ook als je nog geen klant bent.
          </Text>
          <Link src={gids} style={{ fontSize: 8.5, color: NAVY, marginTop: 2 }}>{gids}</Link>
        </View>
      </Page>
    </Document>
  );
}

export async function checklistPoortwachterPdf(invoer: ChecklistPdfInvoer): Promise<Buffer> {
  registreer();
  return renderToBuffer(<ChecklistDocument {...invoer} />);
}

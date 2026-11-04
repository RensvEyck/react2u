import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Logo as PdfLogo, registreer } from "./offertePdf";
import type { ContactInfo } from "./content";
import type { BrochurePubliek } from "./brochures";
import { BERICHT_STANDAARD } from "./brochures";
import type { Dienst } from "./brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "./brochurePrijslijst";
import { datumLang, vulIn } from "./offertes";
import { ondertekenaarRegel, VOORWOORD } from "./offerteVoorwoord";

/*
 * De brochure als pdf (migratie 0030): dezelfde inhoud als de brochurepagina,
 * voor wie hem wil doorsturen of printen. Vier delen: de omslag met het
 * persoonlijke woord, de zes diensten in hun eigen kleur, de prijslijst in de
 * indeling van de gedrukte prijslijst, en het verhaal van React2u met de
 * contactgegevens. Rustig en zonder foto's, net als de offerte-pdf
 * (lib/offertePdf.tsx), waarvan ook het logo en de lettertypen komen.
 */

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";
const LAV = "#F1F0F8";
const RIJLIJN = "#DDDBEC";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.5, color: BODY, paddingTop: 44, paddingBottom: 64, paddingHorizontal: 50, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 50, right: 50, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 8, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE, letterSpacing: 0.6, textTransform: "uppercase" },
  kop: { fontSize: 22, fontWeight: 700, color: INKT, letterSpacing: -0.3, lineHeight: 1.15 },
  tussenkop: { fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3, marginBottom: 6 },
  p: { marginBottom: 6 },
  vet: { fontWeight: 600, color: INKT },
});

function alineas(tekst: string): string[] {
  return tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
}

function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <View style={s.voet} fixed>
      <Text>
        React2u · {contact.addressLine1}, {contact.addressLine2} · {contact.phoneDisplay} · {contact.email} · Brochure {nummer}
      </Text>
    </View>
  );
}

function DienstBlok({ d }: { d: Dienst }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 14 }} wrap={false}>
      <View style={{ width: 5, borderRadius: 3, backgroundColor: d.kleur, marginRight: 14 }} />
      <View style={{ flex: 1, backgroundColor: d.tint, borderRadius: 10, padding: 14 }}>
        <Text style={{ fontSize: 9, fontWeight: 600, color: NAVY }}>React2u</Text>
        <Text style={{ fontSize: 18, fontWeight: 700, color: d.tekst, letterSpacing: -0.3, lineHeight: 1.15 }}>
          {d.naam}
          <Text style={{ fontSize: 8, color: NAVY }}>®</Text>
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 600, color: NAVY, marginTop: 4 }}>
          {d.dienst} <Text style={{ fontWeight: 400, color: BODY }}>{d.tagline}</Text>
        </Text>
        <Text style={{ marginTop: 6, color: BODY }}>{d.omschrijving}</Text>
        <View style={{ marginTop: 6 }}>
          {d.punten.map((p, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 1.5 }}>
              {/* Een stip, geen ✓: dat teken staat niet in Outfit en bleef leeg. */}
              <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: d.kleur, marginRight: 7.5 }} />
              <Text style={{ flex: 1, color: INKT }}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Een aansluiting: de uitgelichte in indigo, de andere licht, zoals bovenaan de
 * gedrukte prijslijst. Hier naast elkaar in plaats van gestapeld, zodat de
 * hele prijslijst op twee pagina's past.
 */
function AansluitingBlok({ a }: { a: Aansluiting }) {
  const donker = a.uitgelicht;
  const kleur = donker ? "#ffffff" : NAVY;
  const zacht = donker ? "#D6D2F7" : BODY;
  return (
    <View style={{ flex: donker ? 1.3 : 1, backgroundColor: donker ? NAVY : LAV, borderRadius: 10, padding: 12 }}>
      {a.badge ? <Text style={[s.label, { fontSize: 7, color: donker ? "#F7A8CB" : MUTE }]}>{a.badge}</Text> : null}
      <Text style={{ fontSize: a.bedrag ? (donker ? 28 : 21) : 18, fontWeight: 700, color: kleur, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 3 }}>{a.prijs}</Text>
      {a.per ? <Text style={{ fontSize: 7.5, color: zacht }}>{a.per}</Text> : null}
      <Text style={{ fontSize: 10, fontWeight: 600, color: kleur, marginTop: 8 }}>{a.naam}</Text>
      {a.tekst ? <Text style={{ fontSize: 7.8, color: zacht, marginTop: 1, lineHeight: 1.4 }}>{a.tekst}</Text> : null}
      {a.noot ? <Text style={{ fontSize: 7.2, color: zacht, marginTop: 3, lineHeight: 1.35 }}>{a.noot}</Text> : null}
    </View>
  );
}

/**
 * Een label of de uurtarieven: kop met ondertitel en een lijn in de
 * labelkleur, daaronder een of twee kolommen. Op een halve breedte staan de
 * lijsten onder elkaar en de ondertitel onder de naam.
 */
function GroepBlok({ g, half = false }: { g: PrijsGroep; half?: boolean }) {
  const kolommen = half ? [halveKolom(g)] : g.kolommen;
  return (
    <View style={{ flex: 1, backgroundColor: g.slug ? g.tint : LAV, borderRadius: 10, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 5 }}>
      <View style={{ flexDirection: half ? "column" : "row", justifyContent: "space-between", alignItems: half ? "flex-start" : "flex-end", borderBottomWidth: 1, borderBottomColor: g.kleur, paddingBottom: 4, marginBottom: 2 }}>
        <View>
          {g.slug ? <Text style={{ fontSize: 7.5, fontWeight: 600, color: NAVY, lineHeight: 1.2 }}>React2u</Text> : null}
          <Text style={{ fontSize: g.slug ? 14 : 12.5, fontWeight: 700, color: g.slug ? g.kleur : NAVY, letterSpacing: -0.2, lineHeight: 1.2 }}>
            {g.naam}
            {g.slug ? <Text style={{ fontSize: 7, color: NAVY }}>®</Text> : null}
          </Text>
        </View>
        {g.ondertitel ? <Text style={{ fontSize: 7.2, color: MUTE, maxWidth: half ? undefined : 270, textAlign: half ? "left" : "right", lineHeight: 1.35, paddingBottom: 1 }}>{g.ondertitel}</Text> : null}
      </View>
      <View style={{ flexDirection: "row" }}>
        {kolommen.map((kolom, k) => (
          <View key={k} style={{ flex: 1, marginLeft: k ? 18 : 0 }}>
            {kolom.map((lijst, li) => (
              <View key={li}>
                {g.metTitels && lijst.titel ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ fontSize: 6.6, fontWeight: 600, color: g.slug ? g.tekst : NAVY, letterSpacing: 0.5, textTransform: "uppercase" }}>{lijst.titel}</Text>
                    {lijst.per ? <Text style={{ fontSize: 6.6, color: MUTE }}>{lijst.per}</Text> : null}
                  </View>
                ) : null}
                {lijst.regels.map((r, ri) => (
                  <View key={ri} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 2.6, borderBottomWidth: ri < lijst.regels.length - 1 ? 0.5 : 0, borderBottomColor: RIJLIJN }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 8.4, color: INKT, lineHeight: 1.35 }}>{r.naam}</Text>
                      {r.sub ? <Text style={{ fontSize: 6.8, color: MUTE, lineHeight: 1.35 }}>{r.sub}</Text> : null}
                    </View>
                    <Text style={r.bedrag ? { fontSize: 8.6, fontWeight: 600, color: INKT, lineHeight: 1.35 } : { fontSize: 7.2, fontWeight: 600, color: MUTE, lineHeight: 1.6 }}>{r.prijs}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function PrijslijstPagina({ p, contact, nummer }: { p: Prijslijst; contact: ContactInfo; nummer: string }) {
  return (
    <Page size="A4" style={s.pagina}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Text style={s.label}>Tarieven</Text>
          <Text style={s.kop}>Prijslijst {p.jaar}</Text>
        </View>
        <Text style={{ fontSize: 8, color: MUTE, paddingBottom: 3 }}>Alle bedragen exclusief btw</Text>
      </View>
      {/* De kleurenbalk van de gedrukte prijslijst: de labels op een rij. */}
      <View style={{ flexDirection: "row", height: 2.5, marginTop: 8, marginBottom: 6 }}>
        {p.groepen.filter((g) => g.slug).map((g) => (
          <View key={g.id} style={{ flex: 1, backgroundColor: g.kleur }} />
        ))}
      </View>

      {p.aansluitingen.length ? (
        <View style={{ flexDirection: "row", marginTop: 4 }} wrap={false}>
          {p.aansluitingen.map((a, i) => (
            <View key={i} style={{ flex: a.uitgelicht ? 1.3 : 1, flexDirection: "row", marginLeft: i ? 8 : 0 }}>
              <AansluitingBlok a={a} />
            </View>
          ))}
        </View>
      ) : null}

      {prijsRijen(p.groepen).map((rij) => (
        <View key={rij[0].id} wrap={false} style={{ flexDirection: "row", marginTop: 8 }}>
          {rij.map((g, i) => (
            <View key={g.id} style={{ flex: 1, flexDirection: "row", marginLeft: i ? 8 : 0 }}>
              <GroepBlok g={g} half={rij.length > 1} />
            </View>
          ))}
        </View>
      ))}

      {p.maatwerk ? (
        <View wrap={false} style={{ flexDirection: "row", backgroundColor: LAV, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 }}>
          <View style={{ width: 150, paddingRight: 12 }}>
            <Text style={[s.label, { fontSize: 7 }]}>Op aanvraag</Text>
            <Text style={{ fontSize: 11, fontWeight: 600, color: NAVY, lineHeight: 1.25 }}>{p.maatwerk.titel}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 7.8, color: BODY, lineHeight: 1.45 }}>{p.maatwerk.tekst}</Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 7.5, color: MUTE, marginTop: 10 }} wrap={false}>
        {p.geldigheid} Prijswijzigingen voorbehouden.
      </Text>
      <Voet contact={contact} nummer={nummer} />
    </Page>
  );
}

export type BrochurePdfInvoer = { brochure: BrochurePubliek; diensten: Dienst[]; prijslijst: Prijslijst; contact: ContactInfo };

function BrochureDocument({ brochure: b, diensten, prijslijst, contact }: BrochurePdfInvoer) {
  const bericht = alineas(vulIn(b.bericht || BERICHT_STANDAARD, { bedrijf: b.bedrijf, contactpersoon: b.contactpersoon }));
  const afzender = b.afzender_naam || "Team React2u";
  const bereik = [b.afzender_telefoon, b.afzender_email].filter(Boolean).join(" · ");
  // Het voorwoord zonder de zinnen die over "dit voorstel" gaan: dat is er nog niet.
  const verhaal = VOORWOORD.alineas.slice(1, -1).map((a) => vulIn(a, { bedrijf: b.bedrijf }));
  return (
    <Document title={`Brochure van React2u voor ${b.bedrijf}`} author="React2u" subject="Zes specialismen, los af te nemen">
      <Page size="A4" style={s.pagina}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <PdfLogo breedte={90} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Brochure {b.nummer}</Text>
            <Text style={{ color: MUTE }}>{datumLang(b.verstuurd_at || b.created_at)}</Text>
          </View>
        </View>
        <Text style={s.label}>Voor {b.bedrijf}</Text>
        <Text style={{ fontSize: 34, fontWeight: 700, color: NAVY, letterSpacing: -0.8, lineHeight: 1.05, marginTop: 6 }}>
          Jouw mensen,{"\n"}
          <Text style={{ color: ROZE }}>onze aandacht.</Text>
        </Text>
        {/* Geen cursief: Outfit staat alleen rechtop in lib/pdf/fonts. */}
        <Text style={{ fontSize: 12, color: NAVY, marginTop: 10 }}>Zes specialismen, los af te nemen.</Text>

        <View style={{ marginTop: 34, backgroundColor: ZACHT, borderRadius: 12, padding: 20 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT, marginBottom: 8 }}>Beste {b.contactpersoon?.trim().split(/\s+/)[0] || "relatie"},</Text>
          {bericht.map((a, i) => (
            <Text key={i} style={[s.p, { fontSize: 10 }]}>{a}</Text>
          ))}
          <Text style={{ marginTop: 6, fontSize: 10 }}>Hartelijke groet,</Text>
          <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT, marginTop: 2 }}>{afzender}</Text>
          <Text style={{ color: MUTE }}>{b.afzender_functie ? `${b.afzender_functie}, React2u` : "React2u"}{bereik ? ` · ${bereik}` : ""}</Text>
        </View>

        <View style={{ marginTop: 34 }}>
          <Text style={s.tussenkop}>In deze brochure</Text>
          {diensten.map((d) => (
            <View key={d.slug} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.kleur, marginRight: 8 }} />
              <Text style={{ color: INKT }}>
                <Text style={s.vet}>React2u {d.naam}</Text> · {d.dienst.replace(/\.$/, "")}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: NAVY, marginRight: 8 }} />
            <Text style={{ color: INKT }}>
              <Text style={s.vet}>Prijslijst {prijslijst.jaar}</Text> · alle tarieven per specialisme
            </Text>
          </View>
        </View>
        <Voet contact={contact} nummer={b.nummer} />
      </Page>

      <Page size="A4" style={s.pagina}>
        <Text style={s.label}>Onze specialismen</Text>
        <Text style={[s.kop, { marginBottom: 6 }]}>Zes specialismen, elk een eigen team</Text>
        <Text style={{ marginBottom: 18 }}>Elk specialisme neem je los af. Je kiest alleen wat bij jullie past, met dezelfde vaste casemanager en hetzelfde online dossier.</Text>
        {diensten.map((d) => (
          <DienstBlok key={d.slug} d={d} />
        ))}
        <Voet contact={contact} nummer={b.nummer} />
      </Page>

      <PrijslijstPagina p={prijslijst} contact={contact} nummer={b.nummer} />

      <Page size="A4" style={s.pagina}>
        <Text style={s.label}>Over React2u</Text>
        <Text style={[s.kop, { marginBottom: 12 }]}>{VOORWOORD.kop}</Text>
        <View style={{ backgroundColor: "#ECEBF5", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 11.5, fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>{VOORWOORD.citaat}</Text>
        </View>
        {verhaal.map((a, i) => (
          <Text key={i} style={[s.p, { fontSize: 10 }]}>{a}</Text>
        ))}
        <Text style={{ marginTop: 6, fontSize: 10 }}>{VOORWOORD.groet}</Text>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {VOORWOORD.ondertekenaars.map((o) => (
            <View key={o.naam} style={{ width: 170, marginRight: 24, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 6 }}>
              <Text style={{ fontFamily: "Caveat", fontSize: 20, color: NAVY, lineHeight: 1.1 }}>{o.naam}</Text>
              <Text style={{ fontSize: 8.5, color: MUTE }}>{ondertekenaarRegel(o)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 30, backgroundColor: NAVY, borderRadius: 12, padding: 20 }} wrap={false}>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2, marginBottom: 6 }}>Kennismaken? Bel gewoon even.</Text>
          <Text style={{ color: "#D6D2F7", marginBottom: 10 }}>
            We horen graag hoe {b.bedrijf} in elkaar zit. Daarna krijg je een voorstel op maat, dat je online bekijkt en ondertekent.
          </Text>
          <Text style={{ color: "#ffffff", fontWeight: 600 }}>{afzender}{b.afzender_functie ? `, ${b.afzender_functie}` : ""}</Text>
          {b.afzender_telefoon ? <Text style={{ color: "#ffffff" }}>{b.afzender_telefoon}</Text> : null}
          {b.afzender_email ? <Text style={{ color: "#ffffff" }}>{b.afzender_email}</Text> : null}
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={s.tussenkop}>Kwaliteit die getoetst wordt</Text>
          <Text>
            Gecertificeerde arbodienst (SBCA) · ISO 9001 kwaliteit · ISO 27001 informatiebeveiliging · ISO 27701 privacy · OVAL. Onafhankelijke instellingen toetsen elk jaar hoe we werken en hoe we met gegevens omgaan.
          </Text>
        </View>
        <Voet contact={contact} nummer={b.nummer} />
      </Page>
    </Document>
  );
}

export async function brochurePdf(invoer: BrochurePdfInvoer): Promise<Buffer> {
  registreer();
  return renderToBuffer(<BrochureDocument {...invoer} />);
}

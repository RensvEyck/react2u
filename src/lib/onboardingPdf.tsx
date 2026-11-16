import "server-only";
import { Circle, Document, Page, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Logo, registreer } from "./offertePdf";
import type { ContactInfo } from "./content";
import { momentLang } from "./offertes";
import {
  documentInfo, INRICHTING, MACHTIGING_TEKST, REACT2U, VERZUIMPROTOCOL, VRAGEN, WELKOM, type Antwoord, type DocumentSleutel,
  type TijdlijnStap, type VeldGroep,
} from "./onboarding";

/*
 * De onboardingdocumenten als pdf (0037), in de huisstijl van de nieuwe site:
 * Outfit, de lila band van de brochure, ronde vormen en de kleuren van de
 * stippen in het logo. Eén pdf per document, zodat de klant precies kan
 * doorsturen of printen wat hij nodig heeft (het verzuimprotocol voor de
 * medewerkers, de machtiging voor wie moet tekenen).
 *
 * Een formulier dat al online is ingevuld, komt ingevuld in de pdf; anders met
 * lege vakken om met de hand in te vullen.
 */

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#E6E5EF";
// De voet in de kleur van de offerte- en brochure-pdf (lib/offertePdf.tsx), zodat de documenten één set zijn.
const VOETLIJN = "#ECE7DE";
const LAV = "#ECEBF5";
const SOFT = "#F6F5FB";
const GROEN = "#0A7A4B";
const ROOD = "#B42318";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.5, color: BODY, paddingTop: 36, paddingBottom: 64, paddingHorizontal: 44, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: VOETLIJN, paddingTop: 8, lineHeight: 1.3 },
  // Met `top`: een Text met `render` binnen een vaste View laat react-pdf (4.9) de hele View weg (zie offertePdf.tsx). 806 = A4 (842) − 26 − de regel.
  paginanummer: { position: "absolute", top: 806, left: 44, right: 44, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  label: { fontSize: 8, fontWeight: 600, color: MUTE, letterSpacing: 0.8, textTransform: "uppercase" },
  h2: { fontSize: 13.5, fontWeight: 600, color: INKT, letterSpacing: -0.2, lineHeight: 1.25, marginBottom: 6 },
  p: { marginBottom: 6, fontSize: 10, lineHeight: 1.6 },
  vet: { fontWeight: 600, color: INKT },
});

export type PdfInvoer = {
  document: DocumentSleutel;
  bedrijf: string;
  nummer: string;
  contact: ContactInfo;
  antwoord?: Antwoord;
  /** Wat React2u zelf invulde (alleen inrichting). */
  intern?: { contractsoort: string | null; debiteurnummer: string | null };
};

/* ---------- bouwstenen ---------- */

/** De opening: een lila vlak met het logo, het document en de klant, en de grote titel. */
function Kop({ document, titel, intro, bedrijf, kleur, compact = false }: { document: string; titel: string; intro?: string; bedrijf: string; kleur: string; compact?: boolean }) {
  return (
    <View style={{ backgroundColor: LAV, borderRadius: 18, paddingHorizontal: compact ? 22 : 26, paddingTop: compact ? 16 : 22, paddingBottom: compact ? 16 : 24, marginBottom: compact ? 14 : 22, position: "relative", overflow: "hidden" }}>
      <Svg style={{ position: "absolute", right: -60, top: -70, width: 220, height: 220 }} viewBox="0 0 220 220">
        <Circle cx="110" cy="110" r="110" fill={NAVY} fillOpacity={0.08} />
      </Svg>
      <Svg style={{ position: "absolute", right: 70, bottom: -40, width: 90, height: 90 }} viewBox="0 0 90 90">
        <Circle cx="45" cy="45" r="45" fill={kleur} fillOpacity={0.14} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Logo breedte={70} />
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: kleur, marginRight: 6 }} />
          <Text style={{ fontSize: 8, fontWeight: 600, color: NAVY }}>Onboarding · {bedrijf}</Text>
        </View>
      </View>
      <Text style={{ ...s.label, color: kleur, marginTop: compact ? 14 : 22 }}>{document}</Text>
      <Text style={{ fontSize: compact ? 21 : 26, fontWeight: 700, color: NAVY, letterSpacing: -0.6, lineHeight: 1.1, marginTop: compact ? 4 : 6 }}>{titel}</Text>
      {intro && <Text style={{ fontSize: compact ? 9.5 : 11, color: BODY, lineHeight: 1.5, marginTop: compact ? 6 : 10, maxWidth: compact ? 440 : 400 }}>{intro}</Text>}
    </View>
  );
}

/**
 * De voet op elke pagina, zoals de offerte-pdf: de bedrijfsgegevens links, het
 * paginanummer los ernaast rechts (kort, anders lopen ze op een A4 in elkaar).
 */
function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, {contact.phoneDisplay}</Text>
      </View>
      <Text style={s.paginanummer} fixed render={({ pageNumber, totalPages }) => `Onboarding ${nummer}, pagina ${pageNumber} van ${totalPages}`} />
    </>
  );
}

function Stip({ kleur, maat = 7 }: { kleur: string; maat?: number }) {
  return <View style={{ width: maat, height: maat, borderRadius: maat / 2, backgroundColor: kleur, marginTop: 4, marginRight: 8 }} />;
}

function Punt({ children, kleur = NAVY }: { children: React.ReactNode; kleur?: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 4 }}>
      <Stip kleur={kleur} maat={5} />
      <Text style={{ flex: 1, fontSize: 10, lineHeight: 1.55 }}>{children}</Text>
    </View>
  );
}

function Hulp({ contact }: { contact: ContactInfo }) {
  return (
    <View wrap={false} style={{ marginTop: 18, backgroundColor: NAVY, borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>Vragen? We zijn goed bereikbaar.</Text>
        <Text style={{ fontSize: 9.5, color: "#D9D8F0", marginTop: 3 }}>Bel eerst je eigen casemanager. Niet bereikbaar? Dan helpt het team je verder, maandag tot en met vrijdag van 9.00 tot 17.00 uur.</Text>
      </View>
      <View style={{ marginLeft: 16, alignItems: "flex-end" }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF" }}>{contact.phoneDisplay}</Text>
        <Text style={{ fontSize: 9.5, color: "#F7A8CB", marginTop: 2 }}>{contact.email}</Text>
      </View>
    </View>
  );
}

/* ---------- welkom ---------- */

const FASE: Record<TijdlijnStap["fase"], { kleur: string; tint: string; naam: string }> = {
  start: { kleur: ROZE, tint: "#FDECF4", naam: "De eerste dagen" },
  begeleiding: { kleur: "#00A098", tint: "#E5F6F4", naam: "Begeleiding" },
  uwv: { kleur: NAVY, tint: LAV, naam: "Eerste en tweede ziektejaar" },
  spoed: { kleur: "#F19001", tint: "#FEF3E2", naam: "Altijd" },
};

function Welkom({ i }: { i: PdfInvoer }) {
  const fases = (["start", "begeleiding", "uwv", "spoed"] as const).map((f) => ({ f, stappen: WELKOM.tijdlijn.filter((t) => t.fase === f) }));
  return (
    <>
      <Kop document="Welkom" titel={WELKOM.titel} intro={WELKOM.intro.join(" ")} bedrijf={i.bedrijf} kleur={NAVY} />
      <Text style={s.h2}>Van ziekmelding tot herstel</Text>
      <Text style={{ ...s.p, color: MUTE, marginBottom: 12 }}>Wie wat doet, en wanneer. Wij bewaken alle termijnen.</Text>
      {fases.map(({ f, stappen }) => (
        <View key={f} style={{ marginBottom: 10 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FASE[f].kleur, marginRight: 7 }} />
            <Text style={{ ...s.label, color: FASE[f].kleur }}>{FASE[f].naam}</Text>
          </View>
          {stappen.map((t, n) => (
            <View key={n} style={{ flexDirection: "row", backgroundColor: FASE[f].tint, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 3 }}>
              <Text style={{ width: 82, fontSize: 9.5, fontWeight: 700, color: FASE[f].kleur }}>{t.moment}</Text>
              <Text style={{ flex: 1, fontSize: 9.5, color: INKT }}>{t.wat}</Text>
              <Text style={{ width: 128, fontSize: 9, color: MUTE, textAlign: "right" }}>{t.wie}</Text>
            </View>
          ))}
        </View>
      ))}
      <View wrap={false} style={{ marginTop: 8, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: ROZE, paddingLeft: 12, paddingVertical: 2 }}>
        <Text style={{ fontSize: 11.5, fontWeight: 600, color: NAVY, lineHeight: 1.45 }}>{WELKOM.geruststelling}</Text>
      </View>
      {WELKOM.secties.map((sec) => (
        <View key={sec.kop} style={{ marginBottom: 12 }} wrap={false}>
          <Text style={s.h2}>{sec.kop}</Text>
          {sec.alineas.map((a, n) => <Text key={n} style={s.p}>{a}</Text>)}
        </View>
      ))}
      <Hulp contact={i.contact} />
    </>
  );
}

/* ---------- verzuimprotocol ---------- */

function Protocol({ i }: { i: PdfInvoer }) {
  return (
    <>
      <Kop document="Voor je medewerkers" titel={VERZUIMPROTOCOL.titel} intro={VERZUIMPROTOCOL.intro} bedrijf={i.bedrijf} kleur="#3AA5DD" compact />
      <View style={{ position: "relative" }}>
        <View style={{ position: "absolute", left: 21, top: 20, bottom: 30, width: 3, backgroundColor: LAV, borderRadius: 2 }} />
        {VERZUIMPROTOCOL.stappen.map((st) => (
          <View key={st.letter} style={{ flexDirection: "row", marginBottom: 8 }} wrap={false}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: st.kleur, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <Text style={{ fontSize: st.letter.length > 1 ? 15 : 19, fontWeight: 700, color: "#FFFFFF" }}>{st.letter}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: SOFT, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 11.5, fontWeight: 700, color: st.kleur, letterSpacing: 0.2, marginBottom: 2 }}>{st.kop}</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.55, color: BODY }}>{st.tekst}</Text>
            </View>
          </View>
        ))}
      </View>
      <View wrap={false} style={{ marginTop: 4, backgroundColor: NAVY, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#FFFFFF" }}>Ziek? Bel eerst je leidinggevende bij {i.bedrijf.replace(/\.$/, "")}. React2u neemt daarna contact met je op.</Text>
        <Text style={{ fontSize: 10, color: "#F7A8CB", marginLeft: 12 }}>React2u · {i.contact.phoneDisplay}</Text>
      </View>
    </>
  );
}

/* ---------- wat je wél mag vragen ---------- */

function Pil({ mag }: { mag: boolean }) {
  return (
    <View style={{ backgroundColor: mag ? "#E3F6ED" : "#FDECEA", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 8.5, fontWeight: 700, color: mag ? GROEN : ROOD }}>{mag ? "Ja" : "Nee"}</Text>
    </View>
  );
}

function Vragen({ i }: { i: PdfInvoer }) {
  return (
    <>
      <Kop document="Voor leidinggevenden en HR" titel={VRAGEN.titel} intro={VRAGEN.intro} bedrijf={i.bedrijf} kleur="#F19001" />
      <View style={{ flexDirection: "row", marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: "#EEF8F3", borderRadius: 14, padding: 14, marginRight: 8 }}>
          <Text style={{ ...s.label, color: GROEN, marginBottom: 8 }}>Dit mag je vragen</Text>
          {VRAGEN.welVragen.map((g) => (
            <View key={g.kop} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 600, color: INKT, marginBottom: 2 }}>{g.kop}</Text>
              {g.punten.map((p) => <Punt key={p} kleur={GROEN}>{p}</Punt>)}
            </View>
          ))}
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <View style={{ backgroundColor: "#FDF0EF", borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Text style={{ ...s.label, color: ROOD, marginBottom: 8 }}>Dit vraag je niet</Text>
            {VRAGEN.nietVragen.map((p) => <Punt key={p} kleur={ROOD}>{p}</Punt>)}
            <Text style={{ fontSize: 9, color: MUTE, marginTop: 4 }}>{VRAGEN.nietToelichting}</Text>
          </View>
          <View style={{ backgroundColor: LAV, borderRadius: 14, padding: 14 }}>
            <Text style={{ ...s.label, color: NAVY, marginBottom: 6 }}>Wat de bedrijfsarts doorgeeft</Text>
            {VRAGEN.bedrijfsarts.punten.map((p) => <Punt key={p}>{p}</Punt>)}
            <Text style={{ fontSize: 9, color: MUTE, marginTop: 4 }}>{VRAGEN.bedrijfsarts.voorbeeld}</Text>
          </View>
        </View>
      </View>

      <View wrap={false} style={{ marginBottom: 16 }}>
        <Text style={s.h2}>In één oogopslag</Text>
        <View style={{ borderRadius: 12, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", backgroundColor: SOFT, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ ...s.label, flex: 1.4 }}>Onderwerp</Text>
            <Text style={{ ...s.label, width: 70 }}>Mag je vragen?</Text>
            <Text style={{ ...s.label, flex: 1.2 }}>Opmerking</Text>
          </View>
          {VRAGEN.tabel.map((r) => (
            <View key={r.onderwerp} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 0.6, borderTopColor: LIJN }}>
              <Text style={{ flex: 1.4, fontSize: 9.5, color: INKT }}>{r.onderwerp}</Text>
              <View style={{ width: 70 }}><Pil mag={r.mag} /></View>
              <Text style={{ flex: 1.2, fontSize: 9, color: MUTE }}>{r.opmerking}</Text>
            </View>
          ))}
        </View>
      </View>

      <View break>
        <Text style={s.h2}>Belscript bij een ziekmelding</Text>
        <Text style={{ ...s.p, color: MUTE, marginBottom: 10 }}>Doel: een goede registratie, planning en voorbereiding op re-integratie, zonder medische details.</Text>
        {VRAGEN.script.map((st, n) => (
          <View key={st.kop} style={{ flexDirection: "row", marginBottom: 9 }} wrap={false}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FEF3E2", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#B86E00" }}>{n + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: 600, color: INKT }}>{st.kop}</Text>
              <Text style={{ fontSize: 10, lineHeight: 1.55, color: BODY, fontStyle: "normal" }}>“{st.zin}”</Text>
              {st.noot && <Text style={{ fontSize: 9, color: MUTE, marginTop: 1 }}>{st.noot}</Text>}
            </View>
          </View>
        ))}
        <View wrap={false} style={{ marginTop: 8, backgroundColor: SOFT, borderRadius: 14, padding: 14 }}>
          <Text style={{ ...s.label, color: NAVY, marginBottom: 6 }}>Voor je eigen dossier</Text>
          {VRAGEN.intern.map((p) => <Punt key={p}>{p}</Punt>)}
        </View>
      </View>
    </>
  );
}

/* ---------- formulieren ---------- */

function Vak({ label, waarde, breed = true, hoog = 22 }: { label: string; waarde?: string; breed?: boolean; hoog?: number }) {
  return (
    <View style={{ width: breed ? "100%" : "48.5%", marginBottom: 6 }} wrap={false}>
      <Text style={{ fontSize: 8.5, fontWeight: 600, color: MUTE, marginBottom: 3 }}>{label}</Text>
      <View style={{ minHeight: hoog, borderRadius: 8, borderWidth: 0.8, borderColor: waarde ? "#D9D7EA" : "#CFCDE3", backgroundColor: waarde ? SOFT : "#FFFFFF", paddingVertical: 5, paddingHorizontal: 8, justifyContent: "center" }}>
        {waarde ? <Text style={{ fontSize: 10, color: INKT }}>{waarde}</Text> : null}
      </View>
    </View>
  );
}

function Groepen({ groepen, data }: { groepen: VeldGroep[]; data: Record<string, string> }) {
  return (
    <>
      {groepen.map((g) => (
        <View key={g.titel} style={{ marginBottom: 6 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
            <Text style={{ ...s.h2, fontSize: 12, marginBottom: 0 }}>{g.titel}</Text>
          </View>
          {g.tekst && <Text style={{ ...s.p, fontSize: 9, color: MUTE, marginBottom: 4 }}>{g.tekst}</Text>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {g.velden.map((v) => (
              <Vak key={v.naam} label={`${v.label}${v.verplicht ? " *" : ""}`} waarde={data[v.naam]} breed={!v.half} hoog={v.naam === "afdelingen" && !data[v.naam] ? 40 : 22} />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function Ingevuld({ a }: { a?: Antwoord }) {
  if (!a) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#E3F6ED", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 14 }}>
      <Text style={{ fontSize: 9.5, fontWeight: 600, color: GROEN }}>Online ingevuld op {momentLang(a.at)}{a.door ? ` door ${a.door}` : ""}</Text>
    </View>
  );
}

function Inrichting({ i }: { i: PdfInvoer }) {
  const data = (i.antwoord?.data as Record<string, string>) || {};
  return (
    <>
      <Kop
        document="Formulier"
        titel="Inrichting nieuwe klant"
        intro={i.antwoord ? "Deze gegevens gebruiken we om jullie omgeving, de facturatie en het verzuimsysteem in te richten." : `Vul dit formulier in en mail het naar ${i.contact.email}. Dan richten wij jullie omgeving, de facturatie en het verzuimsysteem in.`}
        bedrijf={i.bedrijf}
        kleur={ROZE}
        compact
      />
      <Ingevuld a={i.antwoord} />
      <Groepen groepen={INRICHTING} data={data} />
      <View wrap={false} style={{ marginTop: 4, backgroundColor: LAV, borderRadius: 14, padding: 14 }}>
        <Text style={{ ...s.label, color: NAVY, marginBottom: 8 }}>In te vullen door React2u</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Vak label="Contractsoort" waarde={i.intern?.contractsoort || undefined} breed={false} />
          <Vak label="Debiteurnummer" waarde={i.intern?.debiteurnummer || undefined} breed={false} />
        </View>
      </View>
    </>
  );
}

function Machtiging({ i }: { i: PdfInvoer }) {
  const d = (i.antwoord?.data as Record<string, string>) || {};
  const blok = (titel: string, kleur: string, rijen: [string, string | undefined][]) => (
    <View wrap={false} style={{ marginBottom: 9, borderRadius: 14, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
      <View style={{ backgroundColor: kleur === NAVY ? LAV : SOFT, paddingVertical: 7, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: kleur, marginRight: 7 }} />
        <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT }}>{titel}</Text>
      </View>
      {rijen.map(([label, waarde]) => (
        <View key={label} style={{ flexDirection: "row", borderTopWidth: 0.6, borderTopColor: LIJN, minHeight: 19.5, alignItems: "center", paddingHorizontal: 12 }}>
          <Text style={{ width: 150, fontSize: 9.5, color: MUTE }}>{label}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: INKT }}>{waarde || ""}</Text>
        </View>
      ))}
    </View>
  );
  return (
    <>
      <Kop document="Voor de werknemer" titel={MACHTIGING_TEKST.titel} intro={MACHTIGING_TEKST.alinea} bedrijf={i.bedrijf} kleur="#CA152A" compact />
      {blok("Vorige bedrijfsarts en arbodienst", "#CA152A", [
        ["Naam bedrijfsarts", d.bedrijfsarts], ["BIG-registratienummer", d.big], ["Arbodienst", d.arbodienst], ["Vestigingsplaats", d.plaats],
      ])}
      {blok("Nieuwe bedrijfsarts en arbodienst", NAVY, [
        ["Naam", REACT2U.bedrijfsarts.naam], ["BIG-registratienummer", REACT2U.bedrijfsarts.big], ["Arbodienst", "React2u"], ["Bezoekadres", REACT2U.adres], ["E-mailadres", REACT2U.medisch],
      ])}
      {blok("Gegevens werknemer", ROZE, MACHTIGING_TEKST.werknemer.map((l) => [l, undefined]))}
      {/* De handtekening en de slotregel samen, zodat de slotregel nooit alleen op een tweede pagina komt. */}
      <View wrap={false}>
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: MUTE, marginBottom: 3 }}>Datum en plaats</Text>
            <View style={{ height: 52, borderRadius: 10, borderWidth: 0.8, borderColor: "#CFCDE3" }} />
          </View>
          <View style={{ flex: 1.4, marginLeft: 8 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: MUTE, marginBottom: 3 }}>Handtekening werknemer, voor akkoord</Text>
            <View style={{ height: 52, borderRadius: 10, borderWidth: 0.8, borderColor: "#CFCDE3" }} />
          </View>
        </View>
        <Text style={{ fontSize: 8.5, color: MUTE, marginTop: 8 }}>
          Stuur de getekende machtiging naar {REACT2U.medisch}. {MACHTIGING_TEKST.facturen}
        </Text>
      </View>
    </>
  );
}

/* ---------- samen ---------- */

export async function onboardingPdf(i: PdfInvoer): Promise<Buffer> {
  registreer();
  const info = documentInfo(i.document);
  const inhoud =
    i.document === "welkom" ? <Welkom i={i} />
      : i.document === "verzuimprotocol" ? <Protocol i={i} />
        : i.document === "vragen" ? <Vragen i={i} />
          : i.document === "inrichting" ? <Inrichting i={i} />
            : i.document === "machtiging" ? <Machtiging i={i} />
              : null;
  if (!inhoud) throw new Error(`Geen pdf voor ${i.document}`);
  const doc = (
    <Document title={`${info.titel} · ${i.bedrijf}`} author="React2u" subject={`Onboarding ${i.nummer}`} creationDate={new Date()}>
      <Page size="A4" style={s.pagina}>
        {inhoud}
        <Voet contact={i.contact} nummer={i.nummer} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

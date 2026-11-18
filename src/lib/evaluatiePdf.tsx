import "server-only";
import { Circle, Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Logo, registreer } from "./offertePdf";
import type { ContactInfo } from "./content";
import { datumLang, momentLang } from "./offertes";
import {
  aandachtspunten, ACTIES, antwoordInfo, CHECKLIST, DOCUMENT, KTO_UITLEG, VOLGEND_BEZOEK, VRIJE_VELDEN, type Evaluatie, type EvaluatieAntwoorden,
} from "./evaluatie";

/*
 * De klantevaluatie als pdf (0043), in dezelfde huisstijl als de
 * onboardingdocumenten (lib/onboardingPdf.tsx): Outfit, de lila band, ronde
 * vormen en de kleuren van de stippen in het logo. De indeling volgt het
 * Word-formulier "Klant Evaluatie": het blok Gegevens, de checklist met een
 * vakje per punt, de drie vrije vakken, de datum van het volgende bezoek en
 * de tabel met acties.
 *
 * Ingevuld (door de klant, online) komen de antwoorden erin; leeg is het het
 * formulier om te printen en met de hand in te vullen.
 */

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#E6E5EF";
const VOETLIJN = "#ECE7DE";
const LAV = "#ECEBF5";
const SOFT = "#F6F5FB";
const GROEN = "#0A7A4B";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.5, color: BODY, paddingTop: 36, paddingBottom: 64, paddingHorizontal: 44, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: VOETLIJN, paddingTop: 8, lineHeight: 1.3 },
  // Met `top`: een Text met `render` binnen een vaste View laat react-pdf (4.9) de hele View weg (zie offertePdf.tsx).
  paginanummer: { position: "absolute", top: 806, left: 44, right: 44, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  label: { fontSize: 8, fontWeight: 600, color: MUTE, letterSpacing: 0.8, textTransform: "uppercase" },
  h2: { fontSize: 13.5, fontWeight: 600, color: INKT, letterSpacing: -0.2, lineHeight: 1.25, marginBottom: 6 },
  p: { marginBottom: 6, fontSize: 10, lineHeight: 1.6 },
});

export type EvaluatiePdfInvoer = {
  e: Pick<Evaluatie, "nummer" | "bedrijf" | "contactpersoon" | "email" | "bezoek_datum" | "bezoek_tijd" | "antwoorden" | "ingevuld_at" | "ingevuld_door">;
  contact: ContactInfo;
};

/* ---------- bouwstenen ---------- */

function Kop({ bedrijf, ingevuld }: { bedrijf: string; ingevuld: boolean }) {
  return (
    <View style={{ backgroundColor: LAV, borderRadius: 18, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 18, marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <Svg style={{ position: "absolute", right: -60, top: -70, width: 220, height: 220 }} viewBox="0 0 220 220">
        <Circle cx="110" cy="110" r="110" fill={NAVY} fillOpacity={0.08} />
      </Svg>
      <Svg style={{ position: "absolute", right: 70, bottom: -40, width: 90, height: 90 }} viewBox="0 0 90 90">
        <Circle cx="45" cy="45" r="45" fill={ROZE} fillOpacity={0.14} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Logo breedte={70} />
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ROZE, marginRight: 6 }} />
          <Text style={{ fontSize: 8, fontWeight: 600, color: NAVY }}>Klantevaluatie · {bedrijf}</Text>
        </View>
      </View>
      <Text style={{ ...s.label, color: ROZE, marginTop: 16 }}>{ingevuld ? "Jaarlijkse evaluatie, ingevuld door de klant" : "Jaarlijkse evaluatie"}</Text>
      <Text style={{ fontSize: 24, fontWeight: 700, color: NAVY, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 4 }}>{DOCUMENT.titel}</Text>
      <Text style={{ fontSize: 10, color: BODY, lineHeight: 1.5, marginTop: 6, maxWidth: 420 }}>
        Samen kijken we hoe het gaat: wat er goed geregeld is, wat beter kan en wat je komend jaar van React2u nodig hebt.
      </Text>
    </View>
  );
}

function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, {contact.phoneDisplay}</Text>
      </View>
      <Text style={s.paginanummer} fixed render={({ pageNumber, totalPages }) => `Klantevaluatie ${nummer}, pagina ${pageNumber} van ${totalPages}`} />
    </>
  );
}

/** Een rij uit het blok Gegevens: label links, waarde of een leeg vak rechts. */
function Rij({ label, waarde, laatste, labelBreedte = 130 }: { label: string; waarde?: string | null; laatste?: boolean; labelBreedte?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 21, paddingHorizontal: 12, borderBottomWidth: laatste ? 0 : 0.6, borderBottomColor: LIJN }}>
      <Text style={{ width: labelBreedte, fontSize: 9.5, color: MUTE }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 10, color: INKT }}>{waarde || ""}</Text>
    </View>
  );
}

/** Het vakje van het document: leeg, of aangevinkt in de kleur van het antwoord. */
function Vakje({ antwoord }: { antwoord?: "ja" | "nee" | "nvt" }) {
  const kleur = antwoord ? antwoordInfo(antwoord).kleur : "#CFCDE3";
  return (
    <View style={{ width: 13, height: 13, borderRadius: 3, borderWidth: 1, borderColor: kleur, backgroundColor: antwoord ? kleur : "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 1, marginRight: 9 }}>
      {antwoord === "ja" ? (
        <Svg width="9" height="9" viewBox="0 0 24 24"><Path d="M20 6 9 17l-5-5" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
      ) : antwoord === "nee" ? (
        <Svg width="8" height="8" viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" fill="none" /></Svg>
      ) : antwoord === "nvt" ? (
        <Svg width="8" height="8" viewBox="0 0 24 24"><Path d="M5 12h14" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" fill="none" /></Svg>
      ) : null}
    </View>
  );
}

function Pil({ antwoord }: { antwoord: "ja" | "nee" | "nvt" }) {
  const i = antwoordInfo(antwoord);
  return (
    <View style={{ backgroundColor: i.achter, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 8.5, fontWeight: 700, color: i.kleur }}>{i.label}</Text>
    </View>
  );
}

/** Een vrij vak: met de tekst van de klant, of leeg met ruimte om te schrijven (het document had vier regels). */
function Vak({ titel, tekst, hoog = 40, noot }: { titel: string; tekst?: string; hoog?: number; noot?: string }) {
  return (
    <View wrap={false} style={{ marginBottom: 8, borderRadius: 14, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
      <View style={{ backgroundColor: LAV, paddingVertical: 6, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT }}>{titel}</Text>
        {noot ? <Text style={{ fontSize: 8, color: MUTE, marginTop: 1 }}>{noot}</Text> : null}
      </View>
      <View style={{ minHeight: tekst ? 0 : hoog, paddingVertical: 8, paddingHorizontal: 12 }}>
        {tekst ? <Text style={{ fontSize: 10, color: INKT, lineHeight: 1.6 }}>{tekst}</Text> : null}
      </View>
    </View>
  );
}

/* ---------- de inhoud ---------- */

function Gegevens({ e }: { e: EvaluatiePdfInvoer["e"] }) {
  return (
    <View wrap={false} style={{ marginBottom: 14, borderRadius: 14, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
      <View style={{ backgroundColor: SOFT, paddingVertical: 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: NAVY, marginRight: 7 }} />
        <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT }}>Gegevens</Text>
      </View>
      <View style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
        <View style={{ flex: 1 }}><Rij label={DOCUMENT.gegevens.datum} waarde={e.bezoek_datum ? datumLang(e.bezoek_datum) : ""} laatste /></View>
        <View style={{ width: 0.6, backgroundColor: LIJN }} />
        <View style={{ width: 170 }}><Rij label={DOCUMENT.gegevens.tijd} waarde={e.bezoek_tijd} laatste labelBreedte={44} /></View>
      </View>
      <Rij label={DOCUMENT.gegevens.bedrijf} waarde={e.bedrijf} />
      <Rij label={DOCUMENT.gegevens.contactpersoon} waarde={e.contactpersoon} />
      <Rij label={DOCUMENT.gegevens.email} waarde={e.email} laatste />
    </View>
  );
}

function Checklist({ a }: { a: EvaluatieAntwoorden | null }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={s.h2}>{DOCUMENT.checklist}</Text>
      <Text style={{ ...s.p, color: MUTE, marginBottom: 10 }}>
        {a ? "Per punt wat de klant aangaf: geregeld, nog niet, of niet van toepassing." : "Per punt: is het geregeld, nog niet, of niet van toepassing?"}
      </Text>
      {CHECKLIST.map((p, i) => {
        const r = a?.checklist[p.sleutel];
        return (
          <View key={p.sleutel} wrap={false} style={{ flexDirection: "row", paddingVertical: 6, borderTopWidth: i ? 0.6 : 0, borderTopColor: LIJN }}>
            <Vakje antwoord={r?.antwoord} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10.5, fontWeight: 700, color: INKT, letterSpacing: 0.3, flex: 1, paddingRight: 8 }}>{p.titel}</Text>
                {r ? <Pil antwoord={r.antwoord} /> : null}
              </View>
              <Text style={{ fontSize: 9, lineHeight: 1.5, color: BODY, marginTop: 2 }}>{p.toelichting}</Text>
              {p.vragen?.map((v) => (
                <View key={v.naam} style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: 600, color: INKT }}>{v.label}</Text>
                  <View style={{ minHeight: r?.vragen?.[v.naam] ? 0 : 16, borderBottomWidth: r?.vragen?.[v.naam] ? 0 : 0.6, borderBottomColor: "#CFCDE3" }}>
                    {r?.vragen?.[v.naam] ? <Text style={{ fontSize: 9.5, color: NAVY, lineHeight: 1.5 }}>{r.vragen[v.naam]}</Text> : null}
                  </View>
                </View>
              ))}
              {r?.toelichting ? (
                <View style={{ marginTop: 4, backgroundColor: SOFT, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 9.5, color: NAVY, lineHeight: 1.5 }}>{r.toelichting}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Acties({ a }: { a: EvaluatieAntwoorden | null }) {
  const rijen: { actie: string; door: string; status: string }[] = a?.acties.length ? a.acties : Array.from({ length: ACTIES.rijen }, () => ({ actie: "", door: "", status: "" }));
  return (
    <View style={{ borderRadius: 14, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: LAV, paddingVertical: 6, paddingHorizontal: 12 }}>
        <Text style={{ ...s.label, flex: 2, color: INKT }}>{ACTIES.kolommen.actie}</Text>
        <Text style={{ ...s.label, flex: 1, color: INKT }}>{ACTIES.kolommen.door}</Text>
        <Text style={{ ...s.label, flex: 1, color: INKT }}>{ACTIES.kolommen.status}</Text>
      </View>
      {rijen.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", minHeight: 20, alignItems: "center", paddingVertical: 3, paddingHorizontal: 12, borderTopWidth: 0.6, borderTopColor: LIJN }}>
          <Text style={{ flex: 2, fontSize: 9.5, color: INKT, paddingRight: 8 }}>{r.actie}</Text>
          <Text style={{ flex: 1, fontSize: 9.5, color: BODY, paddingRight: 8 }}>{r.door}</Text>
          <Text style={{ flex: 1, fontSize: 9.5, color: BODY }}>{r.status}</Text>
        </View>
      ))}
    </View>
  );
}

function Ingevuld({ e }: { e: EvaluatiePdfInvoer["e"] }) {
  if (!e.ingevuld_at) return null;
  const punten = aandachtspunten(e.antwoorden);
  return (
    <View wrap={false} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#E3F6ED", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12 }}>
      <Text style={{ flex: 1, fontSize: 9.5, fontWeight: 600, color: GROEN }}>
        Online ingevuld op {momentLang(e.ingevuld_at)}{e.ingevuld_door ? ` door ${e.ingevuld_door}` : ""}
      </Text>
      <Text style={{ fontSize: 9, color: GROEN }}>{punten.length ? `${punten.length} ${punten.length === 1 ? "aandachtspunt" : "aandachtspunten"}` : "Geen aandachtspunten"}</Text>
    </View>
  );
}

export async function evaluatiePdf(i: EvaluatiePdfInvoer): Promise<Buffer> {
  registreer();
  const a = i.e.antwoorden;
  const vb = a?.volgend_bezoek;
  return renderToBuffer(
    <Document title={`${DOCUMENT.titel} · ${i.e.bedrijf}`} author="React2u" subject={`Klantevaluatie ${i.e.nummer}`} creationDate={new Date()}>
      <Page size="A4" style={s.pagina}>
        <Kop bedrijf={i.e.bedrijf} ingevuld={Boolean(i.e.ingevuld_at)} />
        <Ingevuld e={i.e} />
        <Gegevens e={i.e} />
        <Checklist a={a} />
        <View>
          {VRIJE_VELDEN.map((v) => (
            <Vak key={v.sleutel} titel={v.titel} tekst={a?.[v.sleutel]} noot={v.sleutel === "evaluatie" ? KTO_UITLEG : undefined} />
          ))}
          <View wrap={false} style={{ flexDirection: "row", marginBottom: 14, borderRadius: 14, borderWidth: 0.8, borderColor: LIJN, overflow: "hidden" }}>
            <View style={{ flex: 1.3 }}><Rij label={VOLGEND_BEZOEK.datum} waarde={vb?.datum ? datumLang(vb.datum) : ""} laatste /></View>
            <View style={{ width: 0.6, backgroundColor: LIJN }} />
            <View style={{ flex: 1 }}><Rij labelBreedte={44} label={VOLGEND_BEZOEK.tijd} waarde={[vb?.tijd, vb?.tot ? `${VOLGEND_BEZOEK.tot} ${vb.tot}` : ""].filter(Boolean).join(" ")} laatste /></View>
          </View>
          <View wrap={false}>
            <Text style={s.h2}>{ACTIES.titel}</Text>
            <Acties a={a} />
          </View>
        </View>
        <Voet contact={i.contact} nummer={i.e.nummer} />
      </Page>
    </Document>
  );
}

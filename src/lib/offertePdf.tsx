import "server-only";
import path from "path";
import { isValidElement } from "react";
import { Document, Font, Image, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { DOTS, WORD } from "@/components/site/Logo";
import { KEURMERKEN } from "@/components/blocks/Gedeeld";
import { blokkenUit } from "@/components/offerte/OfferteTekst";
import type { ContactInfo } from "./content";
import { DOCUMENTEN } from "./documenten";
import { inlineDelen } from "./mdInline";
import {
  aantalVoor, apparaatUit, berekenTotalen, datumLang, DIENSTLABEL, euro, factuurRegels, maandprijs, momentLang, momentPrecies,
  normaliseerRegels, normaliseerVervolg, prijsLabel, regelbedrag, tijdlijnRegels, vulIn, VERVOLG_STANDAARD, VORMEN,
  type CertificaatGegevens, type GetekendeInhoud, type Vorm,
} from "./offertes";

/*
 * De getekende offerte als pdf, met achterin het ondertekeningscertificaat
 * (zoals DocuSign dat meestuurt). Alles komt uit de vastgelegde versie
 * (`getekend_inhoud`), niet uit de offerte zoals hij nu in het beheer staat:
 * de pdf van vandaag is dezelfde als die van de dag van tekenen, op de
 * bedrijfsgegevens van React2u in de voet na.
 *
 * Hetzelfde document als de klantpagina, maar voor papier: briefhoofd met
 * logo, genummerde hoofdstukken, de twee handtekeningvakken, en de
 * keurmerken. Lettertypen staan als woff in lib/pdf/fonts (Outfit en Caveat,
 * OFL); next.config.ts neemt ze mee in de serverbundel.
 */

const FONTS = path.join(process.cwd(), "src/lib/pdf/fonts");
const BEELD = path.join(process.cwd(), "public");

let geregistreerd = false;
function registreer() {
  if (geregistreerd) return;
  Font.register({
    family: "Outfit",
    fonts: [
      { src: path.join(FONTS, "outfit-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONTS, "outfit-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONTS, "outfit-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "Caveat", src: path.join(FONTS, "caveat-latin-500-normal.woff") });
  // Geen afbreekstreepjes midden in woorden; Nederlands afbreken kan react-pdf niet.
  Font.registerHyphenationCallback((woord) => [woord]);
  geregistreerd = true;
}

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const TEAL = "#00A098";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.5, color: BODY, paddingTop: 44, paddingBottom: 64, paddingHorizontal: 50, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 50, right: 50, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 8, lineHeight: 1.3 },
  // Met `top`: een Text met `render` die met `bottom` staat, tekent react-pdf (4.9) niet. 806 = A4 (842) − 26 − de regel.
  paginanummer: { position: "absolute", top: 806, left: 50, right: 50, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE },
  kop: { flexDirection: "row", alignItems: "baseline", marginBottom: 10 },
  kopNr: { fontSize: 10, fontWeight: 600, color: NAVY, width: 18 },
  kopTekst: { fontSize: 15, fontWeight: 600, color: INKT, letterSpacing: -0.2, lineHeight: 1.25 },
  hoofdstuk: { paddingTop: 18, marginTop: 18, borderTopWidth: 0.6, borderTopColor: LIJN },
  rij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 0.6, borderTopColor: LIJN },
  vet: { fontWeight: 600, color: INKT },
  p: { marginBottom: 6 },
  celLabel: { width: 130, color: MUTE },
  // Geen flex: 1 hier; in een kolom maakt dat de hoogte nul en lopen regels over elkaar.
  celWaarde: { color: INKT },
});

/* ---------- bouwstenen ---------- */

function Logo({ breedte = 86 }: { breedte?: number }) {
  return (
    <Svg viewBox="0 0 125 76.303" style={{ width: breedte, height: (breedte * 76.303) / 125 }}>
      {DOTS.map(([fill, d, t], i) => <Path key={i} d={d} transform={t} fill={fill} />)}
      {WORD.map(([d, t], i) => <Path key={`w${i}`} d={d} transform={t} fill="#12100b" />)}
    </Svg>
  );
}

function Inline({ tekst, basis }: { tekst: string; basis: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.soort === "vet" ? (
          <Text key={i} style={{ fontWeight: 600, color: NAVY }}>{d.tekst}</Text>
        ) : d.soort === "link" ? (
          <Link key={i} src={d.href.startsWith("/") ? `${basis}${d.href}` : d.href} style={{ color: NAVY, fontWeight: 600 }}>{d.tekst}</Link>
        ) : (
          <Text key={i}>{d.tekst}</Text>
        )
      )}
    </>
  );
}

/**
 * De mini-opmaak van OfferteTekst (## kop, - lijst, > citaat) voor papier. Met
 * `kop` staan de hoofdstukkop en het eerste blok samen, zodat een kop nooit
 * los onderaan een pagina blijft staan.
 */
function Tekst({ tekst, basis, klein = false, kop }: { tekst: string; basis: string; klein?: boolean; kop?: React.ReactNode }) {
  const maat = klein ? 8.8 : 9.5;
  const blokken = blokkenUit(tekst).map((b, i) => {
        if (b.soort === "h2") return <Text key={i} style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginTop: i ? 8 : 0, marginBottom: 4, lineHeight: 1.3 }}><Inline tekst={b.tekst} basis={basis} /></Text>;
        if (b.soort === "h3") return <Text key={i} style={{ fontSize: 10.5, fontWeight: 600, color: NAVY, marginTop: i ? 4 : 0, marginBottom: 3, lineHeight: 1.35 }}><Inline tekst={b.tekst} basis={basis} /></Text>;
        if (b.soort === "quote")
          return (
            <View key={i} style={{ backgroundColor: "#ECEBF5", borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 6 }}>
              <Text style={{ fontSize: 10.5, fontWeight: 600, color: NAVY, lineHeight: 1.4 }}><Inline tekst={b.tekst} basis={basis} /></Text>
            </View>
          );
        if (b.soort === "ul" || b.soort === "ol")
          return (
            <View key={i} style={{ marginBottom: 6 }}>
              {b.items.map((it, j) => (
                <View key={j} style={{ flexDirection: "row", marginBottom: 2.5 }} wrap={false}>
                  <Text style={{ width: 14, color: NAVY, fontWeight: 600, fontSize: maat }}>{b.soort === "ul" ? "•" : `${j + 1}.`}</Text>
                  <Text style={{ flex: 1, fontSize: maat }}><Inline tekst={it} basis={basis} /></Text>
                </View>
              ))}
            </View>
          );
        return <Text key={i} style={[s.p, { fontSize: maat }]}><Inline tekst={b.soort === "p" ? b.tekst : ""} basis={basis} /></Text>;
      });
  return (
    <View>
      {kop ? <View wrap={false}>{kop}{blokken[0]}</View> : blokken[0]}
      {blokken.slice(1)}
    </View>
  );
}

function Kop({ nr, titel }: { nr: number; titel: string }) {
  return (
    <View style={s.kop} minPresenceAhead={60}>
      <Text style={s.kopNr}>{nr}</Text>
      <Text style={s.kopTekst}>{titel}</Text>
    </View>
  );
}

/**
 * De voet op elke pagina. Het paginanummer staat er los naast: een Text met
 * `render` binnen een vaste View laat react-pdf (4.9) de hele View weglaten.
 */
function Voet({ contact, nummer, concept = false }: { contact: ContactInfo; nummer: string; concept?: boolean }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, KvK {contact.kvk}, btw {contact.btw}</Text>
      </View>
      <Text
        style={s.paginanummer}
        fixed
        render={({ pageNumber, totalPages }) => `Offerte ${nummer}${concept ? " (concept)" : ""}, pagina ${pageNumber} van ${totalPages}`}
      />
    </>
  );
}

/** Groot en licht schuin over elke pagina van een concept: dit is (nog) niet getekend. */
function Watermerk() {
  return (
    <View fixed style={{ position: "absolute", top: 360, left: 0, right: 0, alignItems: "center" }}>
      <Text style={{ fontSize: 92, fontWeight: 700, color: "#F3EFE8", letterSpacing: 4, transform: "rotate(-28deg)" }}>CONCEPT</Text>
    </View>
  );
}

function Vink({ kleur = TEAL, maat = 9 }: { kleur?: string; maat?: number }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: maat, height: maat }}>
      <Path d="m5 12 5 5L20 7" stroke={kleur} strokeWidth={3} fill="none" />
    </Svg>
  );
}

/* ---------- het document ---------- */

export type OffertePdfInvoer = {
  inhoud: GetekendeInhoud;
  hash: string;
  handtekening: string | null;
  certificaat: CertificaatGegevens | null;
  contact: ContactInfo;
  /** De persoonlijke link, waar dezelfde versie en hetzelfde kenmerk online staan. */
  link: string;
  /** Afzender zoals hij nu in de offerte staat, voor oude offertes van vóór 0026 zonder functie in de vastgelegde versie. */
  afzenderFunctie?: string | null;
  /**
   * Een concept om intern te bespreken: de offerte met de huidige keuze, nog
   * niet getekend. Dan geen handtekening, factuurgegevens of certificaat, wel
   * het watermerk en een verwijzing naar de link om online te tekenen. De
   * getekend-velden in `inhoud` zijn dan leeg.
   */
  concept?: boolean;
};

function OfferteDocument({ inhoud, hash, handtekening, certificaat, contact, link, afzenderFunctie, concept = false }: OffertePdfInvoer) {
  const regels = normaliseerRegels(inhoud.regels);
  const t = berekenTotalen(regels, inhoud.keuze, inhoud.medewerkers);
  const tarieven = regels.filter((r) => r.soort === "tarief");
  const vorm: Vorm = inhoud.vorm && VORMEN[inhoud.vorm] ? inhoud.vorm : "verzuimbegeleiding";
  const vervolg = normaliseerVervolg(inhoud.vervolg);
  const stappen = vervolg.length ? vervolg : VERVOLG_STANDAARD;
  const afzender = inhoud.afzender_naam || "React2u";
  const functie = inhoud.afzender_functie ?? afzenderFunctie ?? null;
  const bevestiging = inhoud.bevestiging;
  const factuur = concept ? null : inhoud.factuur;
  const basis = new URL(link).origin;

  const hoofdstukken = [
    "afgenomen",
    ...(inhoud.intro?.trim() ? ["brief"] : []),
    ...(inhoud.inhoud?.trim() ? ["over"] : []),
    "vervolg",
    "voorwaarden",
    "ondertekening",
  ];
  const nr = (id: string) => hoofdstukken.indexOf(id) + 1;

  const meta: [string, string][] = [
    ["Offertenummer", inhoud.nummer],
    ["Datum", datumLang(inhoud.verstuurd_at || inhoud.getekend_at || new Date().toISOString())],
    ...(inhoud.geldig_tot ? [["Geldig tot", datumLang(inhoud.geldig_tot)] as [string, string]] : []),
    ...(inhoud.betreft
      ? [[VORMEN[vorm].betreft || "Betreft", inhoud.betreft] as [string, string]]
      : inhoud.medewerkers
      ? [["Medewerkers", String(inhoud.medewerkers)] as [string, string]]
      : []),
  ];

  return (
    <Document
      title={`Offerte ${inhoud.nummer} ${inhoud.bedrijf}${concept ? " (concept)" : ""}`}
      author="React2u"
      subject={inhoud.titel}
      keywords={concept ? "offerte, concept" : "offerte, getekend, ondertekeningscertificaat"}
      creator="React2u"
      producer="React2u"
      language="nl-NL"
    >
      <Page size="A4" style={s.pagina}>
        {concept && <Watermerk />}
        <Voet contact={contact} nummer={inhoud.nummer} concept={concept} />
        {/* Briefhoofd */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Logo />
            <View style={{ width: 0.6, height: 34, backgroundColor: LIJN, marginHorizontal: 14 }} />
            <Text style={{ fontSize: 9.5, color: BODY, lineHeight: 1.35 }}>Jouw mensen,{"\n"}<Text style={s.vet}>onze aandacht.</Text></Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: VORMEN[vorm].kleur }}>{DIENSTLABEL[vorm]}</Text>
            <Text style={{ fontSize: 10, fontWeight: 600, color: INKT, marginTop: 2, lineHeight: 1.3 }}>Offerte {inhoud.nummer}</Text>
          </View>
        </View>

        {/* Omslag */}
        <View style={{ paddingTop: 26 }}>
          <Text style={{ fontSize: 26, fontWeight: 600, color: INKT, letterSpacing: -0.6, lineHeight: 1.12 }}>{inhoud.titel}</Text>
          <Text style={{ fontSize: 13, color: BODY, marginTop: 6, lineHeight: 1.3 }}>voor <Text style={s.vet}>{inhoud.bedrijf}</Text>{inhoud.contactpersoon ? `, t.a.v. ${inhoud.contactpersoon}` : ""}</Text>
          <View style={{ flexDirection: "row", marginTop: 18, gap: 22 }}>
            {meta.map(([k, v]) => (
              <View key={k}>
                <Text style={s.label}>{k}</Text>
                <Text style={{ fontSize: 10, color: INKT, fontWeight: 600, marginTop: 2 }}>{v}</Text>
              </View>
            ))}
          </View>
          {concept ? (
            <View style={{ marginTop: 18, backgroundColor: "#FFF4E5", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 9.5, color: "#7A4A06" }}>
                <Text style={{ fontWeight: 600 }}>Concept, nog niet ondertekend.</Text> Deze versie is om intern te bespreken, met de onderdelen
                die nu gekozen zijn. Ondertekenen gaat online via de persoonlijke link.
              </Text>
              <Link src={link} style={{ fontSize: 8, color: "#7A4A06", marginTop: 2 }}>{link}</Link>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, backgroundColor: "#E5F6F4", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Vink kleur="#08716B" maat={11} />
              <Text style={{ marginLeft: 7, fontSize: 9.5, color: "#0B5F5A" }}>
                <Text style={{ fontWeight: 600 }}>Ondertekend voor akkoord</Text> door {inhoud.getekend_naam}
                {inhoud.getekend_functie ? ` (${inhoud.getekend_functie})` : ""} op {momentLang(inhoud.getekend_at)}
                {bevestiging ? ", e-mailadres bevestigd met een code" : ""}.
              </Text>
            </View>
          )}
        </View>

        {/* 1. Wat je afneemt */}
        <View style={s.hoofdstuk}>
          <Kop nr={nr("afgenomen")} titel="Wat je afneemt" />
          {t.regels.map(({ regel, bedrag, periode }) => {
            const b = regelbedrag({ bedrag, periode });
            const n = aantalVoor(regel, inhoud.medewerkers);
            const perMedewerker = regel.eenheid === "medewerker_jaar" || regel.eenheid === "medewerker";
            return (
              <View key={regel.id} style={s.rij} wrap={false}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: INKT, fontWeight: 600, fontSize: 10 }}>{regel.naam}</Text>
                  {regel.omschrijving ? <Text style={{ fontSize: 8.5, color: MUTE }}>{regel.omschrijving}</Text> : null}
                  {perMedewerker && n > 1 ? <Text style={{ fontSize: 8.5, color: MUTE }}>{maandprijs(regel).tekst} × {n}</Text> : null}
                </View>
                <Text style={{ color: INKT, fontWeight: 600, fontSize: 10, textAlign: "right" }}>
                  {b.bedrag === null ? "Op aanvraag" : b.bedrag === 0 ? "Inbegrepen" : `${euro(b.bedrag)} ${b.per === "maand" ? "per maand" : "eenmalig"}`}
                </Text>
              </View>
            );
          })}
          <View style={{ marginTop: 6, backgroundColor: ZACHT, borderRadius: 8, padding: 12 }} wrap={false}>
            {t.perMaand > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: INKT, fontWeight: 600, fontSize: 11 }}>Totaal per maand</Text>
                <Text style={{ color: INKT, fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{euro(t.perMaand)}</Text>
              </View>
            )}
            {t.eenmalig > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: t.perMaand > 0 ? 4 : 0 }}>
                <Text style={{ color: INKT, fontWeight: 600, fontSize: t.perMaand > 0 ? 10 : 11 }}>Eenmalig</Text>
                <Text style={{ color: INKT, fontWeight: 700, fontSize: t.perMaand > 0 ? 11 : 13 }}>{euro(t.eenmalig)}</Text>
              </View>
            )}
            <Text style={{ fontSize: 8, color: MUTE, marginTop: 4 }}>Alle bedragen zijn exclusief btw.</Text>
          </View>
          {tarieven.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={[s.label, { marginBottom: 4 }]}>Tarieven bij gebruik</Text>
              {tarieven.map((r) => (
                <View key={r.id} style={[s.rij, { paddingVertical: 4 }]} wrap={false}>
                  <Text style={{ fontSize: 9 }}>{r.naam}</Text>
                  <Text style={{ fontSize: 9, color: INKT, fontWeight: 600 }}>{prijsLabel(r)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {inhoud.intro?.trim() ? (
          <View style={s.hoofdstuk}>
            <Kop nr={nr("brief")} titel="Persoonlijk" />
            {inhoud.intro.split(/\n\s*\n/).map((a, i) => <Text key={i} style={s.p}>{vulIn(a.trim(), inhoud)}</Text>)}
            <Text style={{ fontFamily: "Caveat", fontSize: 22, color: NAVY, marginTop: 2, lineHeight: 1.2 }}>{afzender}</Text>
            <Text style={{ fontSize: 8.5, color: MUTE }}>{[afzender, functie].filter(Boolean).join(", ")}</Text>
          </View>
        ) : null}

        {inhoud.inhoud?.trim() ? (
          <View style={s.hoofdstuk}>
            <Tekst tekst={vulIn(inhoud.inhoud, inhoud)} basis={basis} kop={<Kop nr={nr("over")} titel="Over deze offerte" />} />
          </View>
        ) : null}

        <View style={s.hoofdstuk}>
          <Kop nr={nr("vervolg")} titel="Zo gaat het verder" />
          {stappen.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 6 }} wrap={false}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i === 0 && !concept ? TEAL : NAVY, alignItems: "center", justifyContent: "center", marginRight: 9 }}>
                {i === 0 && !concept ? <Vink kleur="#FFFFFF" maat={8} /> : <Text style={{ color: "#FFFFFF", fontSize: 7.5, fontWeight: 700 }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: INKT, fontWeight: 600 }}>{st.kop}</Text>
                {st.tekst ? <Text style={{ fontSize: 8.8 }}>{st.tekst}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={s.hoofdstuk}>
          <Tekst tekst={vulIn(inhoud.voorwaarden, inhoud).trim() || "- Alle bedragen zijn exclusief btw."} basis={basis} klein kop={<Kop nr={nr("voorwaarden")} titel="Voorwaarden" />} />
          <Text style={{ fontSize: 8.8, marginTop: 2 }}>
            Op deze offerte zijn de <Link src={`${basis}${DOCUMENTEN.algemeneVoorwaarden}`} style={{ color: NAVY, fontWeight: 600 }}>algemene voorwaarden</Link> van React2u van toepassing.
          </Text>
        </View>

        {/* Ondertekening: twee vakken, zoals op papier */}
        <View style={s.hoofdstuk} wrap={false}>
          <Kop nr={nr("ondertekening")} titel="Ondertekening" />
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Opdrachtnemer</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: INKT, marginTop: 3 }}>React2u</Text>
              <Text style={{ fontSize: 8.5, color: MUTE }}>{contact.addressLine1}, {contact.addressLine2}, KvK {contact.kvk}</Text>
              <View style={{ height: 62, justifyContent: "flex-end" }}>
                <Text style={{ fontFamily: "Caveat", fontSize: 26, color: NAVY, lineHeight: 1.15, paddingBottom: 2 }}>{afzender}</Text>
              </View>
              <Text style={{ fontSize: 8.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: "#D9D4CA", paddingTop: 4 }}>
                {[afzender, functie].filter(Boolean).join(", ")}{inhoud.verstuurd_at ? `, ${datumLang(inhoud.verstuurd_at)}` : ""}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Opdrachtgever</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: INKT, marginTop: 3 }}>{inhoud.bedrijf}</Text>
              <Text style={{ fontSize: 8.5, color: MUTE }}>{concept ? "Nog niet getekend" : "Getekend voor akkoord"}</Text>
              <View style={{ height: 62, justifyContent: "flex-end" }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt */}
                {handtekening ? <Image src={handtekening} style={{ width: 170, height: 51 }} /> : null}
              </View>
              <Text style={{ fontSize: 8.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: "#D9D4CA", paddingTop: 4 }}>
                {concept ? "Naam, functie en datum" : `${inhoud.getekend_naam}${inhoud.getekend_functie ? `, ${inhoud.getekend_functie}` : ""}, ${momentLang(inhoud.getekend_at)}`}
              </Text>
            </View>
          </View>

          {concept && (
            <View style={{ marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontWeight: 600, color: INKT }}>Ondertekenen gaat online</Text>
              <Text style={{ fontSize: 8.8, marginTop: 2 }}>
                Open de persoonlijke link, kies wat u wilt afnemen en zet uw handtekening. U bevestigt met een code uit uw mail en ontvangt de
                ondertekende offerte als pdf.
              </Text>
              <Link src={link} style={{ fontSize: 8, color: NAVY, marginTop: 3 }}>{link}</Link>
            </View>
          )}

          {factuur ? (
            <View style={{ flexDirection: "row", marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, padding: 12, gap: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Factuuradres</Text>
                <Text style={{ fontSize: 9, color: INKT, marginTop: 3 }}>{[inhoud.bedrijf, ...factuurRegels(factuur)].join("\n")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Facturen</Text>
                <Text style={{ fontSize: 9, color: INKT, marginTop: 3 }}>
                  {[factuur.email, factuur.kvk ? `KvK ${factuur.kvk}` : "", factuur.inkoopnummer ? `Inkoopnummer ${factuur.inkoopnummer}` : ""].filter(Boolean).join("\n")}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, gap: 16 }}>
            {KEURMERKEN.map((k) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
              <Image key={k.naam} src={path.join(BEELD, k.src)} style={{ height: 24, objectFit: "contain" }} />
            ))}
            <Text style={{ fontSize: 7.5, color: MUTE, flex: 1, textAlign: "right" }}>Gecertificeerde arbodienst</Text>
          </View>
        </View>

      </Page>

      {!concept && <Certificaat inhoud={inhoud} hash={hash} certificaat={certificaat} contact={contact} link={link} />}
    </Document>
  );
}

/* ---------- het ondertekeningscertificaat ---------- */

function CertRij({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <View style={[s.rij, { paddingVertical: 3 }]} wrap={false}>
      <Text style={s.celLabel}>{k}</Text>
      <View style={{ flex: 1 }}>{isValidElement(children) ? children : <Text style={s.celWaarde}>{children}</Text>}</View>
    </View>
  );
}

function Certificaat({ inhoud, hash, certificaat, contact, link }: Pick<OffertePdfInvoer, "inhoud" | "hash" | "certificaat" | "contact" | "link">) {
  const b = inhoud.bevestiging;
  const tijdlijn = certificaat ? tijdlijnRegels(certificaat) : [];
  const apparaat = apparaatUit(certificaat?.agent);
  return (
    <Page size="A4" style={s.pagina}>
      <Voet contact={contact} nummer={inhoud.nummer} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
        <Logo breedte={50} />
        <Text style={{ fontSize: 10, fontWeight: 600, color: INKT }}>Offerte {inhoud.nummer}</Text>
      </View>

      <View style={{ paddingTop: 16 }}>
        <Text style={[s.label, { color: TEAL }]}>Ondertekeningscertificaat</Text>
        <Text style={{ fontSize: 18, fontWeight: 600, color: INKT, marginTop: 3, letterSpacing: -0.4, lineHeight: 1.2 }}>Wie heeft getekend, wanneer en hoe</Text>
        <Text style={{ marginTop: 4, maxWidth: 440 }}>
          Dit certificaat hoort bij offerte {inhoud.nummer} van React2u voor {inhoud.bedrijf}. Het legt vast wie de offerte online heeft ondertekend, hoe het
          e-mailadres is bevestigd en welke versie is getekend.
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={[s.label, { marginBottom: 2 }]}>Ondertekenaar</Text>
        <CertRij k="Naam">{inhoud.getekend_naam}</CertRij>
        {inhoud.getekend_functie ? <CertRij k="Functie">{inhoud.getekend_functie}</CertRij> : null}
        <CertRij k="Namens">{inhoud.bedrijf}</CertRij>
        <CertRij k="E-mailadres">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: INKT }}>{inhoud.getekend_email}</Text>
            {b ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8, backgroundColor: "#E5F6F4", borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 6 }}>
                <Vink kleur="#0B7F78" maat={7.5} />
                <Text style={{ fontSize: 7.5, color: "#0B5F5A", marginLeft: 3, fontWeight: 600 }}>bevestigd</Text>
              </View>
            ) : null}
          </View>
        </CertRij>
        <CertRij k="Bevestiging">
          {b
            ? `Eenmalige code van 6 cijfers, gemaild op ${momentPrecies(b.verstuurd_at)} en ingevuld bij het ondertekenen.`
            : "Geen bevestigingscode (getekend vóór de invoering ervan)."}
        </CertRij>
        <CertRij k="Getekend op">{`${momentPrecies(inhoud.getekend_at)} (Nederlandse tijd)`}</CertRij>
        {certificaat?.ip ? <CertRij k="IP-adres">{certificaat.ip}</CertRij> : null}
        {apparaat ? <CertRij k="Apparaat">{apparaat}</CertRij> : null}
        <CertRij k="Akkoord">Akkoord met de offerte en de algemene voorwaarden van React2u, en bevoegd om namens {inhoud.bedrijf} te tekenen (aangevinkt).</CertRij>
      </View>

      {tijdlijn.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[s.label, { marginBottom: 2 }]}>Tijdlijn</Text>
          {tijdlijn.map((r, i) => (
            <View key={i} style={[s.rij, { paddingVertical: 5 }]} wrap={false}>
              <Text style={s.celLabel}>{momentPrecies(r.at)}</Text>
              <Text style={[s.celWaarde, { flex: 1 }]}>{r.tekst}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        <Text style={[s.label, { marginBottom: 2 }]}>Document</Text>
        <CertRij k="Offerte">{`${inhoud.nummer}: ${inhoud.titel}`}</CertRij>
        <CertRij k="Opdrachtnemer">{`React2u, ${contact.addressLine1}, ${contact.addressLine2}, KvK ${contact.kvk}`}</CertRij>
        <CertRij k="Kenmerk getekende versie">
          <Text style={[s.celWaarde, { fontFamily: "Courier", fontSize: 7.5 }]}>{hash}</Text>
        </CertRij>
        {inhoud.handtekening_hash ? (
          <CertRij k="Kenmerk handtekening">
            <Text style={[s.celWaarde, { fontFamily: "Courier", fontSize: 7.5 }]}>{inhoud.handtekening_hash}</Text>
          </CertRij>
        ) : null}
      </View>

      <View style={{ marginTop: 12, backgroundColor: ZACHT, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 }} wrap={false}>
        <Text style={{ fontWeight: 600, color: INKT }}>Zo controleer je dit document</Text>
        <Text style={{ fontSize: 8.5, marginTop: 2, lineHeight: 1.45 }}>
          Bij het ondertekenen is de volledige offerte vastgelegd, met de gekozen onderdelen, de factuurgegevens en de gegevens van de ondertekenaar. Het kenmerk
          hierboven is de SHA-256-hash van die vastgelegde versie. Na het tekenen kan de offerte niet meer worden gewijzigd. Op de persoonlijke offertepagina staat
          dezelfde versie met hetzelfde kenmerk.
        </Text>
        <Link src={link} style={{ fontSize: 7.5, color: NAVY, marginTop: 3 }}>{link}</Link>
      </View>

    </Page>
  );
}

/** De pdf als buffer, voor de downloadroute en als bijlage bij de mails. */
export async function offertePdf(invoer: OffertePdfInvoer): Promise<Buffer> {
  registreer();
  return renderToBuffer(<OfferteDocument {...invoer} />);
}

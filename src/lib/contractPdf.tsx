import "server-only";
import path from "path";
import { isValidElement } from "react";
import { Document, Image, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { KEURMERKEN } from "@/components/blocks/Gedeeld";
import type { ContactInfo } from "./content";
import { resellerVergoeding } from "./contractTekst";
import {
  CONTRACT_SOORT, comparities, contractInhoud, contractTijdlijn, plaatsUit, react2uPartij, soortVan, versieTekst,
  type ContractCertificaat, type ContractSoort, type GetekendContract,
} from "./contracten";
import { DOCUMENTEN } from "./documenten";
import { inlineDelen } from "./mdInline";
import { ONDERTEKENAAR } from "./offerteOndertekenaar";
import { metPunt } from "./offerteMail";
import { Logo, registreer } from "./offertePdf";
import { apparaatUit, datumLang, momentLang, momentPrecies } from "./offertes";

/*
 * Het contract als pdf (migratie 0031; de resellerovereenkomst sinds 0033):
 * hetzelfde rustige document als de offerte-pdf (lib/offertePdf.tsx), met de
 * opbouw van het Word-bestand: de partijen, de overwegingen, de artikelen en de
 * twee handtekeningen.
 * Getekend: alles uit de vastgelegde versie (`getekend_inhoud`), met achterin
 * het ondertekeningscertificaat. Concept: met het watermerk, open plekken waar
 * de klant nog iets invult en de link om online te tekenen.
 */

const BEELD = path.join(process.cwd(), "public");

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const TEAL = "#00A098";
const ROZE = "#E61674";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.3, color: BODY, paddingTop: 44, paddingBottom: 64, paddingHorizontal: 50, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 26, left: 50, right: 50, fontSize: 7.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 8, lineHeight: 1.3 },
  // Met `top`: een Text met `render` die met `bottom` staat, tekent react-pdf (4.9) niet (zie offertePdf).
  paginanummer: { position: "absolute", top: 806, left: 50, right: 50, textAlign: "right", fontSize: 7.5, color: MUTE, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE },
  sectie: { paddingTop: 16, marginTop: 16, borderTopWidth: 0.6, borderTopColor: LIJN },
  sectieKop: { fontSize: 10.5, fontWeight: 600, color: NAVY, marginBottom: 8, lineHeight: 1.3 },
  artikelKop: { flexDirection: "row", alignItems: "baseline", marginTop: 14, marginBottom: 6 },
  artikelNr: { fontSize: 10, fontWeight: 600, color: ROZE, width: 22 },
  artikelTitel: { fontSize: 12.5, fontWeight: 600, color: INKT, letterSpacing: -0.2, lineHeight: 1.25 },
  rij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 0.6, borderTopColor: LIJN },
  vet: { fontWeight: 600, color: INKT },
  celLabel: { width: 130, color: MUTE },
  celWaarde: { color: INKT },
});

function Inline({ tekst, basis }: { tekst: string; basis: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.soort === "vet" ? (
          <Text key={i} style={{ fontWeight: 600, color: INKT }}>{d.tekst}</Text>
        ) : d.soort === "link" ? (
          <Link key={i} src={d.href.startsWith("/") ? `${basis}${d.href}` : d.href} style={{ color: NAVY, fontWeight: 600 }}>{d.tekst}</Link>
        ) : (
          <Text key={i}>{d.tekst}</Text>
        ),
      )}
    </>
  );
}

function Vink({ kleur = TEAL, maat = 9 }: { kleur?: string; maat?: number }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: maat, height: maat }}>
      <Path d="m5 12 5 5L20 7" stroke={kleur} strokeWidth={3} fill="none" />
    </Svg>
  );
}

function Voet({ contact, nummer, soort, concept = false }: { contact: ContactInfo; nummer: string; soort: ContractSoort; concept?: boolean }) {
  return (
    <>
      <View style={s.voet} fixed>
        <Text>React2u, {contact.addressLine1}, {contact.addressLine2}, KvK {contact.kvk}, btw {contact.btw}</Text>
      </View>
      <Text
        style={s.paginanummer}
        fixed
        render={({ pageNumber, totalPages }) => `${CONTRACT_SOORT[soort].naam} ${nummer}${concept ? " (concept)" : ""}, pagina ${pageNumber} van ${totalPages}`}
      />
    </>
  );
}

function Watermerk() {
  return (
    <View fixed style={{ position: "absolute", top: 360, left: 0, right: 0, alignItems: "center" }}>
      <Text style={{ fontSize: 92, fontWeight: 700, color: "#F3EFE8", letterSpacing: 4, transform: "rotate(-28deg)" }}>CONCEPT</Text>
    </View>
  );
}

/* ---------- het document ---------- */

export type ContractPdfInvoer = {
  /** Getekend: de vastgelegde versie. Concept: het contract zoals het nu is, met lege getekend-velden. */
  inhoud: GetekendContract;
  hash: string;
  handtekening: string | null;
  certificaat: ContractCertificaat | null;
  contact: ContactInfo;
  /** De persoonlijke link, waar dezelfde versie en hetzelfde kenmerk online staan. */
  link: string;
  concept?: boolean;
};

function ContractDocument({ inhoud, hash, handtekening, certificaat, contact, link, concept = false }: ContractPdfInvoer) {
  const basis = new URL(link).origin;
  const soort = soortVan(inhoud);
  const reseller = soort === "reseller";
  const sd = CONTRACT_SOORT[soort];
  const dp = sd.dubbelepunt ? ":" : "";
  const s1 = contractInhoud(inhoud);
  const og = inhoud.opdrachtgever || {};
  const pct = reseller ? resellerVergoeding(inhoud.tekst) : null;
  const meta: [string, string][] = reseller
    ? [
        ["Contractnummer", inhoud.nummer],
        ["Ingangsdatum", inhoud.ingangsdatum ? datumLang(inhoud.ingangsdatum) : "Bij ondertekening"],
        ["Looptijd", "Onbepaalde tijd"],
        ...(pct ? [["Vergoeding", `${pct.jaarEen}% en ${pct.vervolg}%`] as [string, string]] : []),
      ]
    : [
        ["Contractnummer", inhoud.nummer],
        ["Ingangsdatum", datumLang(inhoud.ingangsdatum)],
        ["Einddatum", datumLang(inhoud.einddatum)],
        ...(inhoud.offerte_kenmerk ? [["Offerte", inhoud.offerte_kenmerk.replace(/^Offerte\s+/, "")] as [string, string]] : []),
      ];
  const partijen = comparities(soort, inhoud.opdrachtnemer, og, concept ? {} : { naam: inhoud.getekend_naam, functie: inhoud.getekend_functie });
  const trefwoorden = reseller ? "resellerovereenkomst, partner, arbodienstverlening" : "basiscontract, arbodienstverlening";

  return (
    <Document
      title={`${sd.titel} ${inhoud.nummer} ${inhoud.bedrijf}${concept ? " (concept)" : ""}`}
      author="React2u"
      subject={sd.titel}
      keywords={concept ? `${trefwoorden}, concept` : `${trefwoorden}, getekend, ondertekeningscertificaat`}
      creator="React2u"
      producer="React2u"
      language="nl-NL"
    >
      <Page size="A4" style={s.pagina}>
        {concept && <Watermerk />}
        <Voet contact={contact} nummer={inhoud.nummer} soort={soort} concept={concept} />

        {/* Briefhoofd */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Logo />
            <View style={{ width: 0.6, height: 34, backgroundColor: LIJN, marginHorizontal: 14 }} />
            <Text style={{ fontSize: 9.5, color: BODY, lineHeight: 1.35 }}>Jouw mensen,{"\n"}<Text style={s.vet}>onze aandacht.</Text></Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, color: ROZE }}>Gecertificeerde arbodienst</Text>
            <Text style={{ fontSize: 10, fontWeight: 600, color: INKT, marginTop: 2, lineHeight: 1.3 }}>Contract {inhoud.nummer}</Text>
          </View>
        </View>

        {/* Omslag */}
        <View style={{ paddingTop: 26 }}>
          <Text style={{ fontSize: 26, fontWeight: 600, color: INKT, letterSpacing: -0.6, lineHeight: 1.12 }}>{sd.titel}</Text>
          <Text style={{ fontSize: 13, color: BODY, marginTop: 6, lineHeight: 1.3 }}>
            tussen <Text style={s.vet}>React2u</Text> en <Text style={s.vet}>{og.naam || inhoud.bedrijf}</Text>
          </Text>
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
                <Text style={{ fontWeight: 600 }}>Concept, nog niet ondertekend.</Text> Deze versie is om intern te bespreken. Ondertekenen gaat online via
                de persoonlijke link; daar vul je ook de gegevens van je {reseller ? "kantoor" : "organisatie"} in.
              </Text>
              <Link src={link} style={{ fontSize: 8, color: "#7A4A06", marginTop: 2 }}>{link}</Link>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, backgroundColor: "#E5F6F4", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Vink kleur="#08716B" maat={11} />
              <Text style={{ marginLeft: 7, fontSize: 9.5, color: "#0B5F5A" }}>
                <Text style={{ fontWeight: 600 }}>Ondertekend</Text> door {inhoud.getekend_naam} ({inhoud.getekend_functie}) op {momentLang(inhoud.getekend_at)}
                {inhoud.bevestiging ? ", e-mailadres bevestigd met een code" : ""}.
              </Text>
            </View>
          )}
        </View>

        {/* De partijen */}
        <View style={s.sectie}>
          <Text style={s.sectieKop}>{sd.partijenKop}{dp}</Text>
          {partijen.map((t, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 6 }} wrap={false}>
              <Text style={{ width: 16, color: NAVY, fontWeight: 600 }}>{i + 1}.</Text>
              <Text style={{ flex: 1 }}>{t}</Text>
            </View>
          ))}
          {sd.partijenSlot && <Text style={{ marginTop: 2 }}>{sd.partijenSlot}</Text>}
        </View>

        {/* Overwegingen */}
        <View style={s.sectie}>
          <View minPresenceAhead={40}><Text style={s.sectieKop}>{s1.overwegingenKop}{dp}</Text></View>
          {s1.overwegingen.map((o, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 5 }} wrap={false}>
              <Text style={{ width: 16, color: NAVY, fontWeight: 600 }}>{o.letter}{o.letter ? "." : ""}</Text>
              <View style={{ flex: 1 }}>
                {o.alineas.map((a, j) => <Text key={j} style={{ marginBottom: j < o.alineas.length - 1 ? 3 : 0 }}><Inline tekst={a} basis={basis} /></Text>)}
              </View>
            </View>
          ))}
          {sd.artikelenKop && <Text style={[s.sectieKop, { marginTop: 8, marginBottom: 0 }]}>{sd.artikelenKop}</Text>}
        </View>

        {/* De artikelen, los op de pagina: in één omhullend blok brak react-pdf (4.9) een artikel dat onderaan
            een pagina begon niet af, en schreef het over de voet heen. */}
        <View style={[s.sectie, { paddingTop: 2 }]} />
        <View>
          {s1.artikelen.map((a) => (
            <View key={a.nr}>
              <View style={s.artikelKop} minPresenceAhead={50}>
                <Text style={s.artikelNr}>{a.nr}</Text>
                <Text style={s.artikelTitel}>{a.titel}</Text>
              </View>
              {a.bepalingen.map((b, i) => (
                // Niet over een pagina breken: anders staat het nummer onderaan en de tekst op de volgende pagina.
                <View key={i} style={{ flexDirection: "row", marginBottom: 4.5, paddingLeft: b.diepte > 1 ? 22 : 0 }} wrap={false}>
                  <Text style={{ width: b.diepte > 1 ? 34 : 26, color: NAVY, fontWeight: 600, fontSize: 8.8 }}>{b.nr}</Text>
                  <View style={{ flex: 1 }}>
                    {b.alineas.map((t, j) => {
                      const onder = t.match(/^([a-z])\.\s+(.+)$/);
                      const marge = { marginBottom: j < b.alineas.length - 1 ? 3 : 0 };
                      // "a. eerste Contractjaar ..." (3.1 van de resellerovereenkomst) als ingesprongen onderdeel.
                      return onder ? (
                        <View key={j} style={[{ flexDirection: "row" }, marge]}>
                          <Text style={{ width: 14, color: NAVY, fontWeight: 600 }}>{onder[1]}.</Text>
                          <Text style={{ flex: 1 }}><Inline tekst={onder[2]} basis={basis} /></Text>
                        </View>
                      ) : (
                        <Text key={j} style={marge}><Inline tekst={t} basis={basis} /></Text>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Ondertekening, zoals onderaan het Word-bestand */}
        <View style={s.sectie} wrap={false}>
          <Text style={{ marginBottom: 12, color: INKT }}>{sd.slot}</Text>
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{sd.rollen[0]}</Text>
              <Text style={{ fontSize: 9, color: BODY, marginTop: 3 }}>Te {plaatsUit(inhoud.opdrachtnemer)}, {datumLang(inhoud.verstuurd_at || new Date().toISOString())}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: INKT, marginTop: 2 }}>{react2uPartij(soort, inhoud.opdrachtnemer)}</Text>
              <View style={{ height: 62, justifyContent: "flex-end", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt */}
                <Image src={path.join(BEELD, ONDERTEKENAAR.handtekening)} style={{ height: 56, width: 74, objectFit: "contain", marginBottom: 2 }} />
              </View>
              <Text style={{ fontSize: 8.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: "#D9D4CA", paddingTop: 4 }}>
                Ondergetekende: {ONDERTEKENAAR.naam}, {ONDERTEKENAAR.functie.toLowerCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{sd.rollen[1]}</Text>
              <Text style={{ fontSize: 9, color: BODY, marginTop: 3 }}>
                {concept ? "Te ..........................., ..........................." : `Te ${inhoud.getekend_plaats}, ${datumLang(inhoud.getekend_at)}`}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: INKT, marginTop: 2 }}>{og.naam || inhoud.bedrijf}</Text>
              <View style={{ height: 62, justifyContent: "flex-end" }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt */}
                {handtekening ? <Image src={handtekening} style={{ width: 170, height: 51 }} /> : null}
              </View>
              <Text style={{ fontSize: 8.5, color: MUTE, borderTopWidth: 0.6, borderTopColor: "#D9D4CA", paddingTop: 4 }}>
                {concept ? "Ondergetekende: naam en functie" : `Ondergetekende: ${inhoud.getekend_naam}, ${inhoud.getekend_functie}`}
              </Text>
            </View>
          </View>

          {concept && (
            <View style={{ marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontWeight: 600, color: INKT }}>Ondertekenen gaat online</Text>
              <Text style={{ fontSize: 8.8, marginTop: 2 }}>
                Open de persoonlijke link, vul de gegevens van je {reseller ? "kantoor" : "organisatie"} in en zet je handtekening. Je bevestigt met een code uit je mail en
                ontvangt {reseller ? "de ondertekende overeenkomst" : "het ondertekende contract"} als pdf.
              </Text>
              <Link src={link} style={{ fontSize: 8, color: NAVY, marginTop: 3 }}>{link}</Link>
            </View>
          )}

          {!reseller && (
            <View style={{ marginTop: 16, backgroundColor: ZACHT, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontWeight: 600, color: INKT }}>Documenten bij dit contract</Text>
              <Text style={{ fontSize: 8.8, marginTop: 2 }}>
                <Link src={`${basis}${DOCUMENTEN.algemeneVoorwaarden}`} style={{ color: NAVY, fontWeight: 600 }}>Algemene voorwaarden</Link> (artikel 8.1),{" "}
                <Link src={`${basis}${DOCUMENTEN.privacyverklaring}`} style={{ color: NAVY, fontWeight: 600 }}>privacyreglement</Link> (artikel 5.2 en 8.2) en{" "}
                <Link src={`${basis}${DOCUMENTEN.klachtenregeling}`} style={{ color: NAVY, fontWeight: 600 }}>klachtenregeling</Link> (artikel 4.4) van React2u.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, gap: 16 }}>
            {KEURMERKEN.map((k) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
              <Image key={k.naam} src={path.join(BEELD, k.src)} style={{ height: 24, objectFit: "contain" }} />
            ))}
            <Text style={{ fontSize: 7.5, color: MUTE, flex: 1, textAlign: "right" }}>Tekst {versieTekst(inhoud.tekst_versie, soort)}</Text>
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

function Certificaat({ inhoud, hash, certificaat, contact, link }: Pick<ContractPdfInvoer, "inhoud" | "hash" | "certificaat" | "contact" | "link">) {
  const b = inhoud.bevestiging;
  const tijdlijn = certificaat ? contractTijdlijn(certificaat) : [];
  const apparaat = apparaatUit(certificaat?.agent);
  const og = inhoud.opdrachtgever || {};
  const soort = soortVan(inhoud);
  const reseller = soort === "reseller";
  const sd = CONTRACT_SOORT[soort];
  return (
    <Page size="A4" style={s.pagina}>
      <Voet contact={contact} nummer={inhoud.nummer} soort={soort} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottomWidth: 0.6, borderBottomColor: LIJN }}>
        <Logo breedte={50} />
        <Text style={{ fontSize: 10, fontWeight: 600, color: INKT }}>Contract {inhoud.nummer}</Text>
      </View>

      <View style={{ paddingTop: 16 }}>
        <Text style={[s.label, { color: TEAL }]}>Ondertekeningscertificaat</Text>
        <Text style={{ fontSize: 18, fontWeight: 600, color: INKT, marginTop: 3, letterSpacing: -0.4, lineHeight: 1.2 }}>Wie heeft getekend, wanneer en hoe</Text>
        <Text style={{ marginTop: 4, maxWidth: 440 }}>
          Dit certificaat hoort bij {sd.naam.toLowerCase()} {inhoud.nummer} tussen React2u en {metPunt(og.naam || inhoud.bedrijf)} Het legt vast wie {reseller ? "de overeenkomst" : "het contract"} online heeft
          ondertekend, hoe het e-mailadres is bevestigd en welke versie is getekend.
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={[s.label, { marginBottom: 2 }]}>Ondertekenaar</Text>
        <CertRij k="Naam">{inhoud.getekend_naam}</CertRij>
        <CertRij k="Functie">{inhoud.getekend_functie}</CertRij>
        <CertRij k="Namens">{`${og.naam || inhoud.bedrijf}${og.kvk ? `, KvK ${og.kvk}` : ""}`}</CertRij>
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
        <CertRij k="Bevestiging">{b ? `Eenmalige code van 6 cijfers, gemaild op ${momentPrecies(b.verstuurd_at)} en ingevuld bij het ondertekenen.` : "Geen bevestigingscode."}</CertRij>
        <CertRij k="Getekend op">{`${momentPrecies(inhoud.getekend_at)} (Nederlandse tijd), te ${inhoud.getekend_plaats}`}</CertRij>
        {certificaat?.ip ? <CertRij k="IP-adres">{certificaat.ip}</CertRij> : null}
        {apparaat ? <CertRij k="Apparaat">{apparaat}</CertRij> : null}
        <CertRij k="Akkoord">
          {reseller
            ? `Akkoord met deze resellerovereenkomst, en bevoegd om ${og.naam || inhoud.bedrijf} te vertegenwoordigen (aangevinkt).`
            : `Akkoord met dit basiscontract en de algemene voorwaarden van React2u, en bevoegd om ${og.naam || inhoud.bedrijf} te vertegenwoordigen (aangevinkt).`}
        </CertRij>
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
        <CertRij k="Contract">{`${inhoud.nummer}: ${sd.titel} (tekst ${versieTekst(inhoud.tekst_versie, soort)})`}</CertRij>
        <CertRij k="Looptijd">
          {reseller || !inhoud.einddatum
            ? `Vanaf ${datumLang(inhoud.ingangsdatum)}, voor onbepaalde tijd`
            : `${datumLang(inhoud.ingangsdatum)} tot en met ${datumLang(inhoud.einddatum)}, daarna stilzwijgend verlengd`}
        </CertRij>
        <CertRij k={sd.rollen[0]}>{`${react2uPartij(soort, inhoud.opdrachtnemer)}, ${contact.addressLine1}, ${contact.addressLine2}, KvK ${contact.kvk}`}</CertRij>
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
          Bij het ondertekenen is {reseller ? "de volledige overeenkomst" : "het volledige contract"} vastgelegd: de tekst, beide partijen, de looptijd en de gegevens van de ondertekenaar. Het kenmerk
          hierboven is de SHA-256-hash van die vastgelegde versie. Na het tekenen kan het contract niet meer worden gewijzigd. Op de persoonlijke contractpagina
          staat dezelfde versie met hetzelfde kenmerk.
        </Text>
        <Link src={link} style={{ fontSize: 7.5, color: NAVY, marginTop: 3 }}>{link}</Link>
      </View>
    </Page>
  );
}

/** De pdf als buffer, voor de downloadroutes en als bijlage bij de mails. */
export async function contractPdf(invoer: ContractPdfInvoer): Promise<Buffer> {
  registreer();
  return renderToBuffer(<ContractDocument {...invoer} />);
}

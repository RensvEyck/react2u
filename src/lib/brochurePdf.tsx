import "server-only";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { KEURMERKEN, KLANTEN } from "@/components/blocks/Gedeeld";
import { woordenboek } from "@/lib/woordenboek";
import { Logo as PdfLogo, registreer } from "./offertePdf";
import type { ContactInfo } from "./content";
import type { BrochurePubliek } from "./brochures";
import { BERICHT_STANDAARD } from "./brochures";
import type { Dienst } from "./brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "./brochurePrijslijst";
import {
  DIENSTEN_BROCHURE, DIENSTEN_INTRO, hoofdstuk, HOOFDSTUKKEN, KLANTEN_KOP, KOSTEN, kostenvoorbeeld, OFFERTE_SNEL, OPENING, OVERSTAP, TERMIJNEN,
  TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS,
} from "./brochureVerhaal";
import { datumLang, vulIn } from "./offertes";
import { ondertekenaarRegel, VOORWOORD } from "./offerteVoorwoord";

/*
 * De brochure als pdf (migratie 0030): hetzelfde verhaal als de
 * brochurepagina, in dezelfde acht hoofdstukken (lib/brochureVerhaal.ts),
 * voor wie hem wil doorsturen of printen. Compact, zoals Susanne vroeg: na de
 * omslag lopen alle hoofdstukken door, zonder lege halve pagina's; elke
 * hoofdstukkop blijft bij zijn eerste blok. De prijslijst (07) houdt de
 * indeling van de gedrukte prijslijst, en de overstap (08) sluit af met de
 * zusterlabels en het contact. Elk hoofdstuk opent met dezelfde kop: een
 * indigo lijn met nummer, naam en "01 / 08". Rustig en zonder foto's, net als
 * de offerte-pdf (lib/offertePdf.tsx), waarvan ook het logo en de lettertypen
 * komen. Outfit staat alleen rechtop en heeft geen ✓ of ×: nooit cursief, en
 * vinkjes en kruisjes tekenen we.
 */

const NAVY = "#322E83";
const INKT = "#1C1A4E";
const ROZE = "#E61674";
const ROZE_LICHT = "#F7A8CB";
const BODY = "#55536F";
const MUTE = "#7A7893";
const LIJN = "#ECE7DE";
const ZACHT = "#FAF7F2";
const LAV = "#F1F0F8";
const RIJLIJN = "#DDDBEC";
const TEAL = "#08716B";
const BEELD = path.join(process.cwd(), "public");

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.2, color: BODY, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 48, lineHeight: 1.5 },
  voet: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.2, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 7, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE, letterSpacing: 0.6, textTransform: "uppercase" },
  kop: { fontSize: 22, fontWeight: 700, color: INKT, letterSpacing: -0.3, lineHeight: 1.15 },
  tussenkop: { fontSize: 12.5, fontWeight: 700, color: NAVY, letterSpacing: -0.2, lineHeight: 1.25 },
  p: { marginBottom: 6 },
  vet: { fontWeight: 600, color: INKT },
  hoofdstuk: { marginTop: 26 },
});

function alineas(tekst: string): string[] {
  return tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
}

function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <View style={s.voet} fixed>
      <Text>React2u · {contact.addressLine1}, {contact.addressLine2} · {contact.phoneDisplay} · {contact.email} · Brochure {nummer}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** Een getekend vinkje of kruisje: Outfit heeft die tekens niet. */
function Teken({ soort, kleur }: { soort: "vink" | "kruis"; kleur: string }) {
  if (soort === "kruis") {
    return (
      <View style={{ width: 7, height: 7, marginRight: 7, marginTop: 3.5 }}>
        <View style={{ position: "absolute", left: 3, top: -0.5, width: 1.3, height: 8, backgroundColor: kleur, transform: "rotate(45deg)" }} />
        <View style={{ position: "absolute", left: 3, top: -0.5, width: 1.3, height: 8, backgroundColor: kleur, transform: "rotate(-45deg)" }} />
      </View>
    );
  }
  return <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: kleur, marginRight: 8, marginTop: 4.5 }} />;
}

/**
 * De kop van elk hoofdstuk, de lijn door de brochure: een indigo streep met
 * het nummer, de naam en hoe ver je bent, daaronder de titel en de inleiding.
 * Blijft bij de eerste regels van het hoofdstuk (minPresenceAhead).
 */
function HoofdstukKop({ id, titel, accent, lead, licht = false, rechts }: { id: string; titel: string; accent?: string; lead?: string; licht?: boolean; rechts?: string }) {
  const h = hoofdstuk(id);
  return (
    <View minPresenceAhead={110}>
      <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1.4, borderTopColor: licht ? "#8C88C7" : NAVY, paddingTop: 8 }}>
        <View style={{ width: 17, height: 17, borderRadius: 8.5, backgroundColor: licht ? "#ffffff" : NAVY, alignItems: "center", justifyContent: "center", marginRight: 7 }}>
          <Text style={{ fontSize: 7, fontWeight: 700, color: licht ? NAVY : "#ffffff", lineHeight: 1 }}>{h.nr}</Text>
        </View>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: licht ? ROZE_LICHT : ROZE, letterSpacing: 1.1, textTransform: "uppercase" }}>{h.kort}</Text>
        <Text style={{ marginLeft: "auto", fontSize: 7.5, fontWeight: 600, color: licht ? "#B4ADF2" : MUTE }}>{h.nr} / {String(HOOFDSTUKKEN.length).padStart(2, "0")}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: rechts ? 6 : 9 }}>
        <Text style={{ flex: 1, fontSize: rechts ? 17 : 19, fontWeight: 700, color: licht ? "#ffffff" : INKT, letterSpacing: -0.3, lineHeight: 1.18 }}>
          {titel}
          {accent ? <Text style={{ color: licht ? ROZE_LICHT : ROZE }}> {accent}</Text> : null}
        </Text>
        {rechts ? <Text style={{ fontSize: 8, color: MUTE, paddingBottom: 2 }}>{rechts}</Text> : null}
      </View>
      {lead ? <Text style={{ marginTop: 5, maxWidth: 440, color: licht ? "#D6D2F7" : BODY }}>{lead}</Text> : null}
    </View>
  );
}

function Tussenkop({ titel, lead }: { titel: string; lead?: string }) {
  return (
    <View minPresenceAhead={80} style={{ marginTop: 14 }}>
      <Text style={s.tussenkop}>{titel}</Text>
      {lead ? <Text style={{ marginTop: 3, maxWidth: 440 }}>{lead}</Text> : null}
    </View>
  );
}

/** Twee kolommen met vragen die wel en niet mogen. */
function VraagKolom({ kop, onder, items, kleur, tint, rand, soort }: { kop: string; onder: string; items: string[]; kleur: string; tint: string; rand: string; soort: "vink" | "kruis" }) {
  return (
    <View style={{ flex: 1, backgroundColor: tint, borderWidth: 0.7, borderColor: rand, borderRadius: 10, padding: 11 }}>
      <Text style={{ fontSize: 10.5, fontWeight: 700, color: kleur }}>{kop}</Text>
      <Text style={{ fontSize: 7.6, color: MUTE, marginBottom: 4 }}>{onder}</Text>
      {items.map((v) => (
        <View key={v} style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: rand, paddingVertical: 3.2 }}>
          <Teken soort={soort} kleur={kleur} />
          <Text style={{ flex: 1, fontSize: 8.4, color: INKT, lineHeight: 1.4 }}>{v}</Text>
        </View>
      ))}
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

/** 07: de prijslijst in de indeling van de gedrukte prijslijst, met de kop vast aan de aansluitingen. */
function PrijslijstHoofdstuk({ p }: { p: Prijslijst }) {
  return (
    <View style={s.hoofdstuk}>
      <View wrap={false}>
        <HoofdstukKop id="tarieven" titel={`Prijslijst ${p.jaar}`} rechts="Alle bedragen exclusief btw" />
        {/* De kleurenbalk van de gedrukte prijslijst: de labels op een rij. */}
        <View style={{ flexDirection: "row", height: 2.5, marginTop: 6, marginBottom: 4 }}>
          {p.groepen.filter((g) => g.slug).map((g) => (
            <View key={g.id} style={{ flex: 1, backgroundColor: g.kleur }} />
          ))}
        </View>
        {p.aansluitingen.length ? (
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {p.aansluitingen.map((a, i) => (
              <View key={i} style={{ flex: a.uitgelicht ? 1.3 : 1, flexDirection: "row", marginLeft: i ? 8 : 0 }}>
                <AansluitingBlok a={a} />
              </View>
            ))}
          </View>
        ) : null}
      </View>

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

      <View wrap={false} style={{ marginTop: 9 }}>
        <Text style={{ fontSize: 8.5, color: NAVY }}>
          <Text style={{ fontWeight: 700 }}>{OFFERTE_SNEL.kop}</Text> {OFFERTE_SNEL.tekst}
        </Text>
        <Text style={{ fontSize: 7.5, color: MUTE, marginTop: 2 }}>{p.geldigheid} Prijswijzigingen voorbehouden.</Text>
      </View>
    </View>
  );
}

export type BrochurePdfInvoer = { brochure: BrochurePubliek; diensten: Dienst[]; prijslijst: Prijslijst; contact: ContactInfo };

function BrochureDocument({ brochure: b, diensten, prijslijst, contact }: BrochurePdfInvoer) {
  const bericht = alineas(vulIn(b.bericht || BERICHT_STANDAARD, { bedrijf: b.bedrijf, contactpersoon: b.contactpersoon }));
  const afzender = b.afzender_naam || "Team React2u";
  const bereik = [b.afzender_telefoon, b.afzender_email].filter(Boolean).join(" · ");
  // Het voorwoord van de offerte zonder de zinnen die over "dit voorstel" gaan: dat is er nog niet.
  const verhaal = VOORWOORD.alineas.slice(1, -1).map((a) => vulIn(a, { bedrijf: b.bedrijf }));
  const k = kostenvoorbeeld(prijslijst);
  const citaat = woordenboek("nl").gedeeld.citaten[0];
  // Diensten per twee, zodat een rij nooit over een pagina breekt.
  const dienstRijen = diensten.reduce<Dienst[][]>((rijen, d, i) => (i % 2 ? rijen[rijen.length - 1].push(d) : rijen.push([d]), rijen), []);

  return (
    <Document title={`Brochure van React2u voor ${b.bedrijf}`} author="React2u" subject={`${OPENING.kop} ${OPENING.accent}`}>
      {/* De omslag: de belofte, het persoonlijke woord en de inhoud. */}
      <Page size="A4" style={s.pagina}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 34 }}>
          <PdfLogo breedte={90} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Brochure {b.nummer}</Text>
            <Text style={{ color: MUTE }}>{datumLang(b.verstuurd_at || b.created_at)}</Text>
          </View>
        </View>
        <Text style={s.label}>Brochure voor {b.bedrijf}</Text>
        <Text style={{ fontSize: 31, fontWeight: 700, color: NAVY, letterSpacing: -0.8, lineHeight: 1.08, marginTop: 6 }}>
          {OPENING.kop}{"\n"}
          <Text style={{ color: ROZE }}>{OPENING.accent}</Text>
        </Text>
        <Text style={{ fontSize: 11, color: NAVY, marginTop: 10, maxWidth: 400, lineHeight: 1.45 }}>{OPENING.onder}</Text>

        <View style={{ marginTop: 24, backgroundColor: ZACHT, borderRadius: 12, padding: 18 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT, marginBottom: 7 }}>Beste {b.contactpersoon?.trim().split(/\s+/)[0] || "relatie"},</Text>
          {bericht.map((a, i) => (
            <Text key={i} style={[s.p, { fontSize: 9.6 }]}>{a}</Text>
          ))}
          <Text style={{ marginTop: 4, fontSize: 9.6 }}>Hartelijke groet,</Text>
          <Text style={{ fontSize: 10.5, fontWeight: 600, color: INKT, marginTop: 2 }}>{afzender}</Text>
          <Text style={{ color: MUTE }}>{b.afzender_functie ? `${b.afzender_functie}, React2u` : "React2u"}{bereik ? ` · ${bereik}` : ""}</Text>
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 1.4, borderTopColor: NAVY, paddingTop: 8 }}>
          <Text style={[s.tussenkop, { marginBottom: 6 }]}>In deze brochure</Text>
          {HOOFDSTUKKEN.map((h) => (
            <View key={h.nr} style={{ flexDirection: "row", alignItems: "baseline", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: LIJN }}>
              <Text style={{ width: 26, fontSize: 11, fontWeight: 700, color: ROZE }}>{h.nr}</Text>
              <Text style={{ width: 100, fontSize: 9.4, fontWeight: 600, color: INKT }}>{h.kort}</Text>
              <Text style={{ flex: 1, fontSize: 8.6, color: BODY }}>{h.vraag}</Text>
            </View>
          ))}
        </View>
        <Voet contact={contact} nummer={b.nummer} />
      </Page>

      {/* Na de omslag loopt alles door, 01 tot en met 08: geen lege halve pagina's. */}
      <Page size="A4" style={s.pagina}>
        {/* 01 Hoe het gaat */}
        <HoofdstukKop id="hoe-het-gaat" titel={TIJDLIJN.titel} lead={TIJDLIJN.lead} />
        <View style={{ marginTop: 10, borderTopWidth: 0.6, borderTopColor: RIJLIJN }}>
          {TIJDLIJN.momenten.map((m) => (
            <View key={m.wanneer} wrap={false} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5.5, borderBottomWidth: 0.6, borderBottomColor: RIJLIJN }}>
              <Text style={{ width: 62, fontSize: 10.5, fontWeight: 700, color: ROZE }}>{m.wanneer}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: INKT, paddingRight: 12 }}>{m.wat}</Text>
              <Text style={{ width: 165, fontSize: 8.4, color: MUTE, borderLeftWidth: 0.6, borderLeftColor: RIJLIJN, paddingLeft: 9 }}>{m.vraag}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 13.5, fontWeight: 700, color: NAVY, lineHeight: 1.3, marginTop: 12, maxWidth: 440 }} wrap={false}>
          {TIJDLIJN.slot} <Text style={{ color: ROZE }}>{TIJDLIJN.slotAccent}</Text>
        </Text>

        {/* 02 Voorwoord */}
        <View style={s.hoofdstuk}>
          <HoofdstukKop id="voorwoord" titel={VOORWOORD_BROCHURE.kop} accent={VOORWOORD_BROCHURE.accent} />
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={{ width: 150, paddingRight: 18 }}>
              <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{VOORWOORD.kop}</Text>
              <Text style={{ fontSize: 26, fontWeight: 700, color: ROZE, lineHeight: 1, marginTop: 8 }}>“</Text>
              <Text style={{ fontSize: 9.6, fontWeight: 600, color: NAVY, lineHeight: 1.45 }}>{VOORWOORD.citaat}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {verhaal.map((a, i) => (
                <Text key={i} style={s.p}>{a}</Text>
              ))}
              <Text style={[s.p, { fontWeight: 600, color: NAVY }]}>{VOORWOORD_BROCHURE.slot}</Text>
              <Text>{VOORWOORD.groet}</Text>
              <View style={{ flexDirection: "row", marginTop: 6 }} wrap={false}>
                {VOORWOORD.ondertekenaars.map((o) => (
                  <View key={o.naam} style={{ width: 150, marginRight: 20, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 5 }}>
                    <Text style={{ fontFamily: "Caveat", fontSize: 19, color: NAVY, lineHeight: 1.1 }}>{o.naam}</Text>
                    <Text style={{ fontSize: 8, color: MUTE }}>{ondertekenaarRegel(o)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 03 Onze werkwijze */}
        <View style={s.hoofdstuk}>
          <View wrap={false}>
            <HoofdstukKop id="werkwijze" titel={WERKWIJZE.titel} />
            <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 6 }}>
              <Text style={{ width: 190, fontSize: 13, fontWeight: 700, color: ROZE, lineHeight: 1.3, paddingRight: 18 }}>“{WERKWIJZE.citaat}”</Text>
              <Text style={{ flex: 1 }}>{WERKWIJZE.lead}</Text>
            </View>
          </View>
          {WERKWIJZE.punten.map((p, i) => (
            <View key={p.titel} wrap={false} style={{ flexDirection: "row", borderTopWidth: 0.6, borderTopColor: RIJLIJN, paddingVertical: 8 }}>
              <Text style={{ width: 34, fontSize: 20, fontWeight: 700, color: "#D9D6EF", lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY, marginBottom: 2 }}>{p.titel}</Text>
                <Text style={{ fontSize: 8.8 }}>{p.tekst}</Text>
              </View>
              <View style={{ width: 118, borderLeftWidth: 0.6, borderLeftColor: RIJLIJN, paddingLeft: 10 }}>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: ROZE, letterSpacing: 0.8, textTransform: "uppercase" }}>{p.label}</Text>
                <Text style={{ fontSize: 9.4, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{p.kern}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 04 Wat het kost, in indigo. */}
        <View style={[s.hoofdstuk, { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 18 }]} wrap={false}>
          <HoofdstukKop id="kosten" titel={KOSTEN.titel} licht />
          <Text style={{ fontSize: 42, fontWeight: 700, color: "#C9C2FF", letterSpacing: -1.2, lineHeight: 1, marginTop: 10 }}>{k.totaal}</Text>
          <Text style={{ fontSize: 8.5, fontWeight: 700, color: ROZE_LICHT, marginTop: 4 }}>{KOSTEN.onder}</Text>
          <Text style={{ fontSize: 8.4, color: "#D6D2F7", marginTop: 6, lineHeight: 1.45 }}>{KOSTEN.tekst}</Text>
          <View style={{ flexDirection: "row", borderTopWidth: 0.6, borderTopColor: "#5B57A8", marginTop: 10, paddingTop: 8 }}>
            {[
              { bedrag: k.loon, kop: "Twee jaar loondoorbetaling", tekst: KOSTEN.loon },
              { bedrag: k.sanctie, kop: "Loonsanctie van het UWV", tekst: KOSTEN.sanctie },
              { bedrag: "+", kop: "Re-integratie en vervanging", tekst: KOSTEN.bovenop(k.spoor2) },
            ].map((st, i) => (
              <View key={st.kop} style={{ flex: 1, paddingLeft: i ? 10 : 0, paddingRight: 10, borderLeftWidth: i ? 0.6 : 0, borderLeftColor: "#5B57A8" }}>
                <Text style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{st.bedrag}</Text>
                <Text style={{ fontSize: 8.4, fontWeight: 700, color: "#ffffff", marginTop: 2 }}>{st.kop}</Text>
                <Text style={{ fontSize: 7.6, color: "#C9C5EC", marginTop: 2, lineHeight: 1.45 }}>{st.tekst}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", lineHeight: 1.3, marginTop: 9 }}>
            {KOSTEN.slot} <Text style={{ color: ROZE_LICHT }}>{KOSTEN.slotAccent}</Text>
          </Text>
          {k.compleet ? (
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <View style={{ flex: 1, borderWidth: 0.7, borderColor: "#5B57A8", backgroundColor: "#3B378F", borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, marginRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{k.sanctie}</Text>
                <Text style={{ fontSize: 8.2, fontWeight: 700, color: "#ffffff" }}>Het deel dat je kunt voorkomen</Text>
                <Text style={{ fontSize: 7.6, color: "#C9C5EC" }}>De loondoorbetaling blijft. De sanctie krijg je alleen als het dossier niet op orde is.</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{k.compleet.bedrag}</Text>
                <Text style={{ fontSize: 8.2, fontWeight: 700, color: NAVY }}>Een jaar Casemanagement Compleet voor {k.compleet.werknemers} werknemers</Text>
                <Text style={{ fontSize: 7.6, color: BODY }}>Eén voorkomen sanctie betaalt {k.compleet.jaren} jaar dienstverlening.</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 05 Onze diensten */}
        <View style={s.hoofdstuk}>
          {dienstRijen.map((rij, ri) => (
            <View key={rij[0].slug} wrap={false}>
            {ri === 0 ? <HoofdstukKop id="diensten" titel={DIENSTEN_INTRO.titel} lead={DIENSTEN_INTRO.lead} /> : null}
            <View style={{ flexDirection: "row", marginTop: 7 }}>
              {rij.map((d, i) => {
                const t = DIENSTEN_BROCHURE[d.slug];
                return (
                  <View key={d.slug} style={{ flex: 1, backgroundColor: d.tint, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, marginLeft: i ? 8 : 0 }}>
                    <Text style={{ fontSize: 7.5, fontWeight: 600, color: NAVY, lineHeight: 1.2 }}>React2u</Text>
                    <Text style={{ fontSize: 15, fontWeight: 700, color: d.kleur, letterSpacing: -0.2, lineHeight: 1.15 }}>
                      {d.naam}
                      <Text style={{ fontSize: 7, color: NAVY }}>®</Text>
                    </Text>
                    <Text style={{ fontSize: 8.8, fontWeight: 700, color: NAVY, marginTop: 3 }}>{t.dienst}</Text>
                    <Text style={{ fontSize: 8.1, marginTop: 2, lineHeight: 1.4 }}>{t.tekst}</Text>
                    <View style={{ marginTop: 4, borderTopWidth: 0.5, borderTopColor: RIJLIJN, paddingTop: 3 }}>
                      {t.punten.map((p) => (
                        <View key={p} style={{ flexDirection: "row" }}>
                          <Teken soort="vink" kleur={d.kleur} />
                          <Text style={{ flex: 1, fontSize: 8.1, color: INKT, lineHeight: 1.38 }}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
            </View>
          ))}
          <View wrap={false} style={{ flexDirection: "row", alignItems: "center", backgroundColor: NAVY, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 }}>
            <Text style={{ width: 140, fontSize: 10.5, fontWeight: 700, color: "#ffffff" }}>{DIENSTEN_INTRO.twijfel}</Text>
            <Text style={{ flex: 1, fontSize: 7.8, color: "#D6D2F7", paddingRight: 12 }}>{DIENSTEN_INTRO.twijfelTekst}</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: ROZE_LICHT }}>{contact.phoneDisplay.replace(/\s*-\s*/, " ")}</Text>
          </View>
        </View>

        {/* 06 Jouw rol */}
        <View style={s.hoofdstuk}>
          <View wrap={false}>
            <HoofdstukKop id="jouw-rol" titel="Wat mag je vragen," accent="en wat moet je doen?" />
            <Tussenkop titel={VRAGEN.titel} lead={VRAGEN.lead} />
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <VraagKolom {...VRAGEN.mag} kleur={TEAL} tint="#E5F5F4" rand="#BFE6E3" soort="vink" />
              <View style={{ width: 8 }} />
              <VraagKolom {...VRAGEN.magNiet} kleur="#C2105E" tint="#FDECF4" rand="#F7C6DC" soort="kruis" />
            </View>
          </View>
          <View wrap={false} style={{ flexDirection: "row", backgroundColor: NAVY, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 }}>
            <Text style={{ width: 140, fontSize: 10.5, fontWeight: 700, color: "#ffffff" }}>{VRAGEN.bedrijfsarts}</Text>
            <Text style={{ flex: 1, fontSize: 7.8, color: "#D6D2F7", lineHeight: 1.45 }}>{VRAGEN.bedrijfsartsTekst}</Text>
          </View>

          <View wrap={false}>
            <Tussenkop titel={TERMIJNEN.titel} lead={TERMIJNEN.lead} />
            <View style={{ flexDirection: "row", backgroundColor: NAVY, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginTop: 8 }}>
              {["Moment", "Jij als werkgever", "React2u"].map((t, i) => (
                <Text key={t} style={{ width: i ? undefined : 105, flex: i ? 1 : undefined, fontSize: 6.8, fontWeight: 700, color: "#ffffff", letterSpacing: 0.8, textTransform: "uppercase", paddingRight: 10 }}>{t}</Text>
              ))}
            </View>
          </View>
          <View style={{ borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 0.6, borderTopWidth: 0, borderColor: RIJLIJN }}>
            {TERMIJNEN.rijen.map((r, i) => (
              <View key={r.stap} wrap={false} style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 10, borderTopWidth: i ? 0.5 : 0, borderTopColor: RIJLIJN, backgroundColor: i % 2 ? "#FBFBFE" : "#ffffff" }}>
                <View style={{ width: 105, paddingRight: 10 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#C2105E" }}>{r.moment}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 700, color: NAVY }}>{r.stap}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 8.2, paddingRight: 10, lineHeight: 1.45 }}>{r.jij}</Text>
                <View style={{ flex: 1, flexDirection: "row" }}>
                  <Teken soort="vink" kleur={TEAL} />
                  <Text style={{ flex: 1, fontSize: 8.2, color: INKT, lineHeight: 1.45 }}>{r.wij}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tussen 06 en 07: wat werkgevers zeggen. */}
        <View style={[s.hoofdstuk, { borderTopWidth: 0.6, borderTopColor: RIJLIJN, paddingTop: 12 }]} wrap={false}>
          <Text style={s.tussenkop}>{KLANTEN_KOP}</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={{ fontSize: 30, fontWeight: 700, color: ROZE, lineHeight: 1, width: 24 }}>“</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: NAVY, lineHeight: 1.45 }}>{citaat.tekst}</Text>
              <Text style={{ fontSize: 8.4, color: MUTE, marginTop: 4 }}>{citaat.naam}, {citaat.rol}</Text>
            </View>
          </View>
          <Text style={[s.label, { fontSize: 7, marginTop: 12 }]}>Zij gingen je voor</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            {KLANTEN.map((kl) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
              <Image key={kl.src} src={path.join(BEELD, kl.src)} style={{ height: 20, maxWidth: 74, objectFit: "contain" }} />
            ))}
          </View>
        </View>

        {/* 07 Tarieven */}
        <PrijslijstHoofdstuk p={prijslijst} />

        {/* 08 Overstappen, de groep en het contact. */}
        <View style={s.hoofdstuk} wrap={false}>
          <HoofdstukKop id="overstappen" titel={OVERSTAP.titel} lead={OVERSTAP.lead} />
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            {OVERSTAP.stappen.map((st, i) => (
              <View key={st.kop} style={{ flex: 1, borderTopWidth: 1.2, borderTopColor: ROZE, paddingTop: 7, marginLeft: i ? 12 : 0 }}>
                <Text style={{ fontSize: 20, fontWeight: 700, color: "#D9D6EF", lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY, marginTop: 5 }}>{st.kop}</Text>
                <Text style={{ fontSize: 8.4, marginTop: 2, lineHeight: 1.45 }}>{st.tekst}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ borderLeftWidth: 2.5, borderLeftColor: ROZE, paddingLeft: 12, marginTop: 12 }} wrap={false}>
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: NAVY }}>{OVERSTAP.geenDatum}</Text>
          <Text style={{ fontSize: 8.8, marginTop: 3 }}>{OVERSTAP.geenDatumTekst}</Text>
          <Text style={{ fontSize: 8.2, color: "#7A4A06", backgroundColor: "#FFF4E5", borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, marginTop: 6 }}>{OVERSTAP.or}</Text>
        </View>

        <View style={{ marginTop: 14 }} wrap={false}>
          <Text style={s.tussenkop}>{ZUSTERLABELS.titel}</Text>
          <Text style={{ marginTop: 3, maxWidth: 440 }}>{ZUSTERLABELS.lead}</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {ZUSTERLABELS.labels.map((l, i) => {
              const hier = !l.url;
              return (
                <View key={l.naam} style={{ flex: 1, borderWidth: 0.7, borderColor: hier ? "#F7C6DC" : RIJLIJN, backgroundColor: hier ? "#FDECF4" : "#ffffff", borderRadius: 9, padding: 9, marginLeft: i ? 6 : 0 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY }}>{l.naam}</Text>
                  <Text style={{ fontSize: 6.6, fontWeight: 700, color: l.kleur, letterSpacing: 0.7, textTransform: "uppercase" }}>{l.soort}</Text>
                  <Text style={{ fontSize: 7.6, marginTop: 4, lineHeight: 1.4 }}>{l.tekst}</Text>
                  <Text style={{ fontSize: 7.8, fontWeight: 700, color: hier ? ROZE : NAVY, marginTop: 5 }}>{l.url || "Deze brochure"}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 14, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18 }} wrap={false}>
          <Text style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2, marginBottom: 5 }}>Benieuwd wat het voor {b.bedrijf} betekent? Bel gewoon even.</Text>
          <Text style={{ color: "#D6D2F7", marginBottom: 9 }}>
            We horen graag hoe jullie organisatie in elkaar zit. Daarna krijg je een voorstel op maat, dat je online bekijkt en ondertekent.
          </Text>
          <Text style={{ color: "#ffffff", fontWeight: 600 }}>{afzender}{b.afzender_functie ? `, ${b.afzender_functie}` : ""}</Text>
          {b.afzender_telefoon ? <Text style={{ color: "#ffffff" }}>{b.afzender_telefoon}</Text> : null}
          {b.afzender_email ? <Text style={{ color: "#ffffff" }}>{b.afzender_email}</Text> : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 16 }} wrap={false}>
          {KEURMERKEN.map((km) => (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
            <Image key={km.naam} src={path.join(BEELD, km.src)} style={{ height: 24, objectFit: "contain" }} />
          ))}
          <Text style={{ fontSize: 7.5, color: MUTE, flex: 1, textAlign: "right" }}>Gecertificeerde arbodienst · ISO 9001, 27001 en 27701 · OVAL</Text>
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

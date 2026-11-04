import "server-only";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { KEURMERKEN, KLANTEN } from "@/components/blocks/Gedeeld";
import { woordenboek } from "@/lib/woordenboek";
import { Logo as PdfLogo, registreer } from "./offertePdf";
import type { ContactInfo } from "./content";
import type { BrochurePubliek } from "./brochures";
import { BERICHT_STANDAARD } from "./brochures";
import type { Dienst } from "./brochureHuisstijl";
import { halveKolom, prijsRijen, type Aansluiting, type PrijsGroep, type Prijslijst } from "./brochurePrijslijst";
import {
  DIENSTEN_BROCHURE, DIENSTEN_INTRO, HOOFDSTUKKEN, KLANTEN_KOP, KOSTEN, kostenvoorbeeld, OFFERTE_SNEL, OPENING, OVERSTAP, TERMIJNEN,
  TIJDLIJN, VOORWOORD_BROCHURE, VRAGEN, WERKWIJZE, ZUSTERLABELS,
} from "./brochureVerhaal";
import { CONSTELLATIE, hoofdstukKleur, KLEUR, mix, REIS, spoor, ZACHT } from "./stippenSpoor";
import { datumLang, vulIn } from "./offertes";
import { ondertekenaarRegel, VOORWOORD } from "./offerteVoorwoord";

/*
 * De brochure als pdf (migratie 0030): hetzelfde verhaal als de pagina, in
 * dezelfde beeldtaal, die van de homepage (lib/stippenSpoor.ts): koppen in de
 * kleuren van het logo, de constellatie van ronde foto's, en de stippenreis
 * als lijn. De omslag staat apart; daarna lopen het persoonlijke woord, de
 * inhoud (een reis langs acht stations) en de hoofdstukken door, zodat er geen
 * halflege pagina's zijn (Susanne: "te veel pagina's, ruim opgezet"). 01 is de
 * reis zonder regie (grijs en onderbroken), 06 dezelfde reis met React2u (in
 * kleur). De ronde foto's staan als png in public/beeld/brochure: react-pdf
 * leest geen webp en knipt niet rond. Outfit staat alleen rechtop en heeft
 * geen ✓ of ×: nooit cursief, en vinkjes en kruisjes tekenen we.
 */

const NAVY = KLEUR.navy;
const INKT = "#1C1A4E";
const ROZE = KLEUR.pink;
const ROZE_LICHT = "#F7A8CB";
const BODY = "#5E5C78";
const MUTE = "#7A7893";
const LIJN = "#ECEBF3";
const GRIJS = "#F6F5FB";
const LAV = "#F1F0F8";
const RIJLIJN = "#DDDBEC";
const BEELD = path.join(process.cwd(), "public");
const FOTO = (naam: string) => path.join(BEELD, "beeld", "brochure", `${naam}.png`);
const BREED = 499;

const s = StyleSheet.create({
  pagina: { fontFamily: "Outfit", fontSize: 9.2, color: BODY, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 48, lineHeight: 1.5 },
  // Vaste hoogte: zonder groeide de hoogte van deze vaste voet per pagina tot react-pdf vastliep.
  voet: { position: "absolute", bottom: 24, left: 48, right: 48, height: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 7.2, color: MUTE, borderTopWidth: 0.6, borderTopColor: LIJN, paddingTop: 7, lineHeight: 1.3 },
  label: { fontSize: 8.5, fontWeight: 600, color: MUTE, letterSpacing: 0.6, textTransform: "uppercase" },
  tussenkop: { fontSize: 12.5, fontWeight: 700, color: NAVY, letterSpacing: -0.2, lineHeight: 1.25 },
  p: { marginBottom: 6 },
  hoofdstuk: { marginTop: 22 },
});

function alineas(tekst: string): string[] {
  return tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
}

function Voet({ contact, nummer }: { contact: ContactInfo; nummer: string }) {
  return (
    <View style={s.voet} fixed>
      <Text style={{ flex: 1 }}>React2u · {contact.addressLine1}, {contact.addressLine2} · {contact.phoneDisplay} · {contact.email} · Brochure {nummer}</Text>
      <Text style={{ width: 40, textAlign: "right" }} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** Een getekend vinkje (stip) of kruisje: Outfit heeft die tekens niet. */
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

/** Label met een stip, zoals op de homepage. */
function Stiplabel({ kleur, children }: { kleur: string; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: ZACHT[kleur] || "#EEEDF8", alignItems: "center", justifyContent: "center", marginRight: 5 }}>
        <View style={{ width: 4.4, height: 4.4, borderRadius: 2.2, backgroundColor: kleur }} />
      </View>
      <Text style={{ fontSize: 7.5, fontWeight: 700, color: kleur, letterSpacing: 1, textTransform: "uppercase" }}>{children}</Text>
    </View>
  );
}

/** Kopregels in de kleuren van het logo. */
function Kopregels({ regels, maat = 21 }: { regels: [string, string][]; maat?: number }) {
  return (
    <View>
      {regels.map(([tekst, kleur], i) => (
        <Text key={i} style={{ fontSize: maat, fontWeight: 700, color: kleur, letterSpacing: -0.4, lineHeight: 1.1 }}>{tekst}</Text>
      ))}
    </View>
  );
}

/**
 * De kop van een hoofdstuk: het label met de stip in de kleur van zijn
 * station ("03 · Onze werkwijze"), de kop in regels (de eerste indigo, de
 * rest in de stationskleur) en de inleiding.
 */
function Kop({ id, regels, lead, rechts }: { id: string; regels: string[]; lead?: string; rechts?: string }) {
  const i = HOOFDSTUKKEN.findIndex((x) => x.id === id);
  const h = HOOFDSTUKKEN[i];
  const kleur = hoofdstukKleur(i);
  return (
    <View>
      <Stiplabel kleur={kleur}>{`${h.nr} · ${h.kort}`}</Stiplabel>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 7 }}>
        <View style={{ flex: 1 }}><Kopregels regels={regels.map((r, k) => [r, k === 0 ? NAVY : kleur] as [string, string])} /></View>
        {rechts ? <Text style={{ fontSize: 8, color: MUTE, paddingBottom: 3 }}>{rechts}</Text> : null}
      </View>
      {lead ? <Text style={{ marginTop: 6, maxWidth: 450 }}>{lead}</Text> : null}
    </View>
  );
}

/** Een ronde foto met een ring. */
function Rond({ naam, maat, ring = "#ffffff", style }: { naam: string; maat: number; ring?: string; style?: Style }) {
  const r = 3.5;
  return (
    <View style={[{ width: maat + 2 * r, height: maat + 2 * r, borderRadius: (maat + 2 * r) / 2, backgroundColor: ring, padding: r }, style ?? {}]}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt */}
      <Image src={FOTO(naam)} style={{ width: maat, height: maat }} />
    </View>
  );
}

/** De constellatie van de homepage, geschaald: drie ronde foto's tussen de gekleurde stippen. */
function Constellatie({ breedte, fotos }: { breedte: number; fotos: string[] }) {
  const f = breedte / CONSTELLATIE.breed;
  return (
    <View style={{ width: breedte, height: CONSTELLATIE.hoog * f }}>
      {CONSTELLATIE.stippen.map(([x, y, m, c], i) => (
        <View key={`s${i}`} style={{ position: "absolute", left: x * f, top: y * f, width: m * f, height: m * f, borderRadius: (m * f) / 2, backgroundColor: c }} />
      ))}
      {fotos.slice(0, 3).map((naam, i) => {
        const [x, y, m] = CONSTELLATIE.fotos[i];
        return <Rond key={naam} naam={naam} maat={m * f - 7} style={{ position: "absolute", left: x * f, top: y * f }} />;
      })}
    </View>
  );
}

type Station = { kleur: string; teken: string; label?: string; titel: string; tekst?: string };

/** De liggende stippenreis: stations op een golvende lijn, een spoor van stippen ertussen, de teksten eronder. */
function Reis({ stations, hoog, R, tekstMaat = 8 }: { stations: Station[]; hoog: number; R: number; tekstMaat?: number }) {
  const n = stations.length;
  const SX = stations.map((_, i) => (BREED / n) * (i + 0.5));
  const SY = stations.map((_, i) => (i % 2 ? hoog * 0.58 : hoog * 0.42));
  const stippen = stations.slice(0, -1).flatMap((st, i) =>
    spoor([SX[i], SY[i]], [SX[i + 1], SY[i + 1]], { kleurA: st.kleur, kleurB: stations[i + 1].kleur, rand: R + 6, stap: R > 20 ? 8.5 : 7, boog: R > 20 ? 10 : 6, grootte: R > 20 ? [3.4, 1.6] : [2.6, 1.2] }),
  );
  return (
    <View wrap={false}>
      <View style={{ width: BREED, height: hoog }}>
        {stippen.map((d, i) => (
          <View key={`d${i}`} style={{ position: "absolute", left: d.x - d.s / 2, top: d.y - d.s / 2, width: d.s, height: d.s, borderRadius: d.s / 2, backgroundColor: d.c }} />
        ))}
        {stations.map((st, i) => (
          <View key={`s${i}`} style={{ position: "absolute", left: SX[i] - R - 3, top: SY[i] - R - 3, width: 2 * R + 6, height: 2 * R + 6, borderRadius: R + 3, backgroundColor: "#ffffff", padding: 3 }}>
            <View style={{ flex: 1, borderRadius: R, backgroundColor: st.kleur, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#ffffff", fontWeight: 700, fontSize: R * 0.62, lineHeight: 1 }}>{st.teken}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row" }}>
        {stations.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", paddingHorizontal: n > 4 ? 2 : 8 }}>
            {st.label ? <Text style={{ fontSize: 6.8, fontWeight: 700, color: st.kleur, letterSpacing: 0.7, textTransform: "uppercase", textAlign: "center" }}>{st.label}</Text> : null}
            <Text style={{ fontSize: n > 4 ? 8.4 : 10.5, fontWeight: 700, color: NAVY, textAlign: "center", lineHeight: 1.25, marginTop: 1 }}>{st.titel}</Text>
            {st.tekst ? <Text style={{ fontSize: tekstMaat, color: BODY, textAlign: "center", lineHeight: 1.4, marginTop: 2 }}>{st.tekst}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

type Halte = { kleur: string; wanneer: string; inhoud: React.ReactNode; nadruk?: boolean };

/** De staande stippenreis: in kleur van station naar station, of grijs en onderbroken (de reis zonder regie). */
function Tijdreis({ haltes, grijs = false }: { haltes: Halte[]; grijs?: boolean }) {
  return (
    <View>
      {haltes.map((h, i) => {
        const laatste = i === haltes.length - 1;
        const vol = !grijs || h.nadruk;
        return (
          <View key={i} wrap={false} style={{ flexDirection: "row" }}>
            <View style={{ width: 46, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: vol ? h.kleur : "#ffffff", borderWidth: vol ? 0 : 1.2, borderStyle: "dashed", borderColor: "#CFCDE0", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 7.2, fontWeight: 700, color: vol ? "#ffffff" : "#9C99BD", textAlign: "center", lineHeight: 1.05 }}>{h.wanneer}</Text>
              </View>
              {!laatste ? (
                <View style={{ flexGrow: 1, justifyContent: "space-around", alignItems: "center", paddingVertical: 3, minHeight: 16 }}>
                  {[0, 1, 2, 3].map((k) => (
                    grijs && k === 2 ? <View key={k} style={{ height: 3.2 }} /> : (
                      <View key={k} style={{ width: 3.2, height: 3.2, borderRadius: 1.6, backgroundColor: grijs ? "#CFCDE0" : mix(h.kleur, haltes[i + 1].kleur, k / 3) }} />
                    )
                  ))}
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, paddingLeft: 12, paddingTop: 5, paddingBottom: laatste ? 0 : 5 }}>{h.inhoud}</View>
          </View>
        );
      })}
    </View>
  );
}

/** Twee kolommen met vragen die wel en niet mogen. */
function VraagKolom({ kop, onder, items, kleur, soort }: { kop: string; onder: string; items: string[]; kleur: string; soort: "vink" | "kruis" }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 10, padding: 11 }}>
      <Text style={{ fontSize: 10.5, fontWeight: 700, color: kleur }}>{kop}</Text>
      <Text style={{ fontSize: 7.6, color: MUTE, marginBottom: 4 }}>{onder}</Text>
      {items.map((v) => (
        <View key={v} style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: LIJN, paddingVertical: 3.2 }}>
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
        <Kop id="tarieven" regels={[`Prijslijst ${p.jaar}`]} rechts="Alle bedragen exclusief btw" />
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
  const kleurVan = (id: string) => hoofdstukKleur(HOOFDSTUKKEN.findIndex((x) => x.id === id));
  const accent = OPENING.accent.split(" ");
  const initialen = afzender.split(/\s+/).map((w) => w[0]).filter(Boolean);
  // Diensten per twee, zodat een rij nooit over een pagina breekt.
  const dienstRijen = diensten.reduce<Dienst[][]>((rijen, d, i) => (i % 2 ? rijen[rijen.length - 1].push(d) : rijen.push([d]), rijen), []);
  const laatste = TIJDLIJN.momenten.length - 1;

  return (
    <Document title={`Brochure van React2u voor ${b.bedrijf}`} author="React2u" subject={`${OPENING.kop} ${OPENING.accent}`}>
      {/* De omslag: de constellatie en de kop in drie kleuren. */}
      <Page size="A4" style={[s.pagina, { backgroundColor: GRIJS }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <PdfLogo breedte={88} />
          <View style={{ alignItems: "flex-end", paddingTop: 6 }}>
            <Stiplabel kleur={KLEUR.teal}>Brochure voor werkgevers</Stiplabel>
            <Text style={{ color: MUTE, marginTop: 4 }}>{b.nummer} · {datumLang(b.verstuurd_at || b.created_at)}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", marginTop: 8 }}>
          <Constellatie breedte={340} fotos={["kring-gesprek", "persoonlijk-gesprek", "op-de-werkvloer"]} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Kopregels maat={40} regels={[[OPENING.kop, NAVY], [accent.slice(0, 2).join(" "), KLEUR.teal], [accent.slice(2).join(" "), ROZE]]} />
          <Text style={{ fontSize: 11.5, color: BODY, marginTop: 12, maxWidth: 380, lineHeight: 1.55 }}>{OPENING.onder}</Text>
        </View>
        <View style={{ position: "absolute", left: 48, right: 48, bottom: 64, flexDirection: "row", justifyContent: "space-between", backgroundColor: "#ffffff", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 9.5 }}>Voor <Text style={{ fontWeight: 700, color: NAVY }}>{b.bedrijf}</Text></Text>
          <Text style={{ fontSize: 9.5 }}>Van <Text style={{ fontWeight: 700, color: NAVY }}>{afzender}</Text>{b.afzender_functie ? `, ${b.afzender_functie.toLowerCase()}` : ""}</Text>
        </View>
        <Voet contact={contact} nummer={b.nummer} />
      </Page>

      {/* Daarna loopt alles door: het woord, de inhoud en de acht hoofdstukken. */}
      <Page size="A4" style={s.pagina}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, paddingRight: 22 }}>
            <Stiplabel kleur={ROZE}>Persoonlijk woord</Stiplabel>
            <Text style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 8, marginBottom: 8 }}>Beste {b.contactpersoon?.trim().split(/\s+/)[0] || "relatie"},</Text>
            {bericht.map((a, i) => (
              <Text key={i} style={[s.p, { fontSize: 9.8 }]}>{a}</Text>
            ))}
          </View>
          <View style={{ width: 170, backgroundColor: GRIJS, borderRadius: 14, padding: 14, alignSelf: "flex-start" }}>
            <Text style={[s.label, { fontSize: 7 }]}>Je contactpersoon</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                <Text style={{ color: "#ffffff", fontWeight: 700, fontSize: 10 }}>{(initialen[0] || "R") + (initialen.length > 1 ? initialen[initialen.length - 1] : "")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: NAVY }}>{afzender}</Text>
                <Text style={{ fontSize: 7.8, color: MUTE }}>{b.afzender_functie ? `${b.afzender_functie}, React2u` : "React2u"}</Text>
              </View>
            </View>
            {bereik ? <Text style={{ fontSize: 8, color: NAVY, fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>{bereik.replace(" · ", "\n")}</Text> : null}
          </View>
        </View>

        {/* De inhoud als stippenreis: acht stations, de hoofdstukken. */}
        <View style={[s.hoofdstuk, { backgroundColor: GRIJS, borderRadius: 14, padding: 16 }]} wrap={false}>
          <Stiplabel kleur={KLEUR.teal}>In deze brochure</Stiplabel>
          <View style={{ marginTop: 6, marginBottom: 2 }}><Kopregels maat={18} regels={[["Acht stations, ", NAVY], ["één reis.", KLEUR.teal]]} /></View>
          <View style={{ marginLeft: -16 }}>
            <Reis hoog={62} R={15} tekstMaat={6.6} stations={HOOFDSTUKKEN.map((h, i) => ({ kleur: hoofdstukKleur(i), teken: h.nr, titel: h.kort, tekst: h.vraag }))} />
          </View>
        </View>

        {/* 01 Hoe het gaat: de reis zonder regie. */}
        <View style={s.hoofdstuk}>
          <View wrap={false} style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Kop id="hoe-het-gaat" regels={[TIJDLIJN.titel + ".", "Een klok die je niet ziet."]} lead={TIJDLIJN.lead} />
            </View>
            <Rond naam="even-bellen" maat={92} ring={ZACHT[ROZE]} />
          </View>
          <View style={{ marginTop: 12 }}>
            <Tijdreis
              grijs
              haltes={TIJDLIJN.momenten.map((m, i) => ({
                kleur: i === 0 ? NAVY : ROZE,
                wanneer: m.wanneer,
                nadruk: i === 0 || i === laatste,
                inhoud: (
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ flex: 1, fontSize: 9.2, color: i === laatste ? ROZE : INKT, fontWeight: i === laatste ? 700 : 400, paddingRight: 10 }}>{m.wat}</Text>
                    <Text style={{ width: 170, fontSize: 8, color: i === laatste ? ROZE : BODY, backgroundColor: i === laatste ? ZACHT[ROZE] : GRIJS, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 7 }}>{m.vraag}</Text>
                  </View>
                ),
              }))}
            />
          </View>
          <View wrap={false} style={{ backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, marginTop: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", lineHeight: 1.3 }}>{TIJDLIJN.slot} <Text style={{ color: ROZE_LICHT }}>{TIJDLIJN.slotAccent}</Text></Text>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              {Array.from({ length: 56 }, (_, i) => {
                const t = i / 55;
                const seg = Math.min(REIS.length - 2, Math.floor(t * (REIS.length - 1)));
                const u = t * (REIS.length - 1) - seg;
                const m = 3 + 1.4 * Math.sin(Math.PI * u);
                return <View key={i} style={{ width: m, height: m, borderRadius: m / 2, backgroundColor: mix(REIS[seg], REIS[seg + 1], u), marginRight: 8.6 - m }} />;
              })}
            </View>
          </View>
        </View>

        {/* 02 Voorwoord */}
        <View style={s.hoofdstuk}>
          <View wrap={false}>
            <View style={{ flexDirection: "row", height: 40, marginBottom: 6 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#ffffff", fontWeight: 700, fontSize: 12 }}>C</Text></View>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: kleurVan("voorwoord"), alignItems: "center", justifyContent: "center", marginLeft: -8, marginTop: 4, borderWidth: 2, borderColor: "#ffffff" }}><Text style={{ color: "#ffffff", fontWeight: 700, fontSize: 12 }}>S</Text></View>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ROZE, marginLeft: 6 }} />
            </View>
            <Kop id="voorwoord" regels={[VOORWOORD_BROCHURE.kop, VOORWOORD_BROCHURE.accent]} />
          </View>
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={{ width: 150, paddingRight: 18 }}>
              <Text style={{ fontSize: 26, fontWeight: 700, color: ROZE, lineHeight: 1 }}>“</Text>
              <Text style={{ fontSize: 10, fontWeight: 600, color: NAVY, lineHeight: 1.45 }}>{VOORWOORD.citaat}</Text>
              <Text style={{ fontSize: 8, color: MUTE, marginTop: 6 }}>Cindy en Susanne, React2u</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{VOORWOORD.kop}.</Text>
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

        {/* 03 Onze werkwijze: drie stations, zoals de reis op de homepage. */}
        <View style={s.hoofdstuk} wrap={false}>
          <Kop id="werkwijze" regels={["Wat je van ons merkt."]} lead={`“${WERKWIJZE.citaat}” ${WERKWIJZE.lead}`} />
          <View style={{ marginTop: 8 }}>
            <Reis hoog={92} R={26} tekstMaat={8.2} stations={WERKWIJZE.punten.map((p, i) => ({ kleur: [KLEUR.teal, KLEUR.sky, KLEUR.pink][i], teken: String(i + 1), label: p.label, titel: p.titel, tekst: `${p.tekst} ${p.kern}.` }))} />
          </View>
        </View>

        {/* 04 Wat het kost: de bedragen als cirkels, naar verhouding. */}
        <View style={[s.hoofdstuk, { backgroundColor: GRIJS, borderRadius: 14, padding: 16 }]} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Kop id="kosten" regels={["Eén vastgelopen dossier", `kost je ${k.totaal}.`]} lead={KOSTEN.tekst} />
            </View>
            <View style={{ width: 230, height: 170 }}>
              <View style={{ position: "absolute", left: 0, top: 4, width: 150, height: 150, borderRadius: 75, backgroundColor: NAVY, justifyContent: "center", paddingLeft: 24 }}>
                <Text style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.5 }}>{k.loon}</Text>
                <Text style={{ fontSize: 7, color: "#D6D2F7", width: 76, lineHeight: 1.35 }}>Twee jaar loondoorbetaling. Die heb je hoe dan ook.</Text>
              </View>
              <View style={{ position: "absolute", left: 112, top: 50, width: 114, height: 114, borderRadius: 57, backgroundColor: GRIJS, padding: 4 }}>
                <View style={{ flex: 1, borderRadius: 53, backgroundColor: ROZE, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: -0.4 }}>{k.sanctie}</Text>
                  <Text style={{ fontSize: 7, color: "#ffffff", textAlign: "center" }}>Loonsanctie.{"\n"}Te voorkomen.</Text>
                </View>
              </View>
              <View style={{ position: "absolute", left: 206, top: 30, width: 14, height: 14, borderRadius: 7, backgroundColor: KLEUR.orange }} />
              <View style={{ position: "absolute", left: 216, top: 14, width: 7, height: 7, borderRadius: 3.5, backgroundColor: KLEUR.sky }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {[
              { bedrag: k.loon, kop: "Twee jaar loondoorbetaling", tekst: KOSTEN.loon, kleur: NAVY },
              { bedrag: k.sanctie, kop: "Loonsanctie van het UWV", tekst: KOSTEN.sanctie, kleur: ROZE },
              { bedrag: "+", kop: "Re-integratie en vervanging", tekst: KOSTEN.bovenop(k.spoor2), kleur: KLEUR.orange },
            ].map((st, i) => (
              <View key={st.kop} style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 10, padding: 9, marginLeft: i ? 7 : 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: st.kleur, marginRight: 5 }} />
                  <Text style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{st.bedrag}</Text>
                </View>
                <Text style={{ fontSize: 8.2, fontWeight: 700, color: NAVY, marginTop: 2 }}>{st.kop}</Text>
                <Text style={{ fontSize: 7.4, lineHeight: 1.4, marginTop: 2 }}>{st.tekst}</Text>
              </View>
            ))}
          </View>
          {k.compleet ? (
            <View style={{ flexDirection: "row", backgroundColor: "#ffffff", borderRadius: 10, padding: 12, marginTop: 8, alignItems: "center" }}>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: 700, color: NAVY, lineHeight: 1.3, paddingRight: 14 }}>{KOSTEN.slot} <Text style={{ color: ROZE }}>{KOSTEN.slotAccent}</Text></Text>
              <View style={{ width: 210, borderLeftWidth: 0.6, borderLeftColor: LIJN, paddingLeft: 12 }}>
                <Stiplabel kleur={KLEUR.teal}>Eén voorkomen sanctie betaalt</Stiplabel>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginRight: 8 }}>{k.compleet.jaren} jaar</Text>
                  {[KLEUR.teal, KLEUR.sky, KLEUR.pink, KLEUR.orange].map((kl, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: kl, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 6, fontWeight: 700, color: "#ffffff" }}>{i + 1}</Text></View>
                      <View style={{ width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: kl, marginHorizontal: 1.6 }} />
                    </View>
                  ))}
                  <View style={{ flexDirection: "row" }}>
                    <View style={{ width: 6.5, height: 13, borderTopLeftRadius: 6.5, borderBottomLeftRadius: 6.5, backgroundColor: KLEUR.red }} />
                    <View style={{ width: 6.5, height: 13, borderTopRightRadius: 6.5, borderBottomRightRadius: 6.5, backgroundColor: "#F3D3D7" }} />
                  </View>
                </View>
                <Text style={{ fontSize: 7.2, color: BODY, marginTop: 4 }}>Casemanagement Compleet voor {k.compleet.werknemers} werknemers kost {k.compleet.bedrag} per jaar.</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 05 Onze diensten */}
        <View style={s.hoofdstuk}>
          {dienstRijen.map((rij, ri) => (
            <View key={rij[0].slug} wrap={false}>
              {ri === 0 ? <Kop id="diensten" regels={["Zes diensten,", "één dak."]} lead={DIENSTEN_INTRO.lead} /> : null}
              <View style={{ flexDirection: "row", marginTop: 7 }}>
                {rij.map((d, i) => {
                  const t = DIENSTEN_BROCHURE[d.slug];
                  return (
                    <View key={d.slug} style={{ flex: 1, backgroundColor: d.tint, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, marginLeft: i ? 8 : 0 }}>
                      <View style={{ position: "absolute", right: -14, top: -14, width: 44, height: 44, borderRadius: 22, backgroundColor: d.kleur, opacity: 0.16 }} />
                      <Text style={{ fontSize: 7.5, fontWeight: 600, color: NAVY, lineHeight: 1.2 }}>React2u</Text>
                      <Text style={{ fontSize: 15, fontWeight: 700, color: d.kleur, letterSpacing: -0.2, lineHeight: 1.15 }}>
                        {d.naam}
                        <Text style={{ fontSize: 7, color: NAVY }}>®</Text>
                      </Text>
                      <Text style={{ fontSize: 8.8, fontWeight: 700, color: NAVY, marginTop: 3 }}>{t.dienst}</Text>
                      <Text style={{ fontSize: 8, marginTop: 2, lineHeight: 1.35 }}>{t.tekst}</Text>
                      <View style={{ marginTop: 4, borderTopWidth: 0.5, borderTopColor: RIJLIJN, paddingTop: 3 }}>
                        {t.punten.map((p) => (
                          <View key={p} style={{ flexDirection: "row" }}>
                            <Teken soort="vink" kleur={d.kleur} />
                            <Text style={{ flex: 1, fontSize: 8, color: INKT, lineHeight: 1.3 }}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          <View wrap={false} style={{ flexDirection: "row", alignItems: "center", backgroundColor: NAVY, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8 }}>
            <Rond naam="even-bellen" maat={48} ring={ROZE} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 11.5, fontWeight: 700, color: "#ffffff" }}>{DIENSTEN_INTRO.twijfel}</Text>
              <Text style={{ fontSize: 7.8, color: "#D6D2F7", marginTop: 2 }}>{DIENSTEN_INTRO.twijfelTekst}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: 700, color: ROZE_LICHT }}>{contact.phoneDisplay.replace(/\s*-\s*/, " ")}</Text>
          </View>
        </View>

        {/* Tussen 05 en 06: wat werkgevers zeggen. */}
        <View style={[s.hoofdstuk, { backgroundColor: GRIJS, borderRadius: 14, padding: 14 }]} wrap={false}>
          <Stiplabel kleur={ROZE}>Klanten aan het woord</Stiplabel>
          <Text style={[s.tussenkop, { marginTop: 6 }]}>{KLANTEN_KOP}</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={{ fontSize: 30, fontWeight: 700, color: ROZE, lineHeight: 1, width: 24 }}>“</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: NAVY, lineHeight: 1.45 }}>{citaat.tekst}</Text>
              <Text style={{ fontSize: 8.4, color: MUTE, marginTop: 4 }}>{citaat.naam}, {citaat.rol}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, backgroundColor: "#ffffff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
            {KLANTEN.map((kl) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
              <Image key={kl.src} src={path.join(BEELD, kl.src)} style={{ height: 18, maxWidth: 66, objectFit: "contain" }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 14 }}>
            {KEURMERKEN.map((km) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf kent geen alt
              <Image key={km.naam} src={path.join(BEELD, km.src)} style={{ height: 22, objectFit: "contain" }} />
            ))}
            <Text style={{ fontSize: 7.5, color: MUTE, flex: 1, textAlign: "right" }}>Gecertificeerde arbodienst · ISO 9001, 27001 en 27701 · OVAL</Text>
          </View>
        </View>

        {/* 06 Jouw rol: wat je mag vragen, en dezelfde reis als in 01, nu in kleur. */}
        <View style={s.hoofdstuk}>
          <View wrap={false} style={{ backgroundColor: GRIJS, borderRadius: 14, padding: 14 }}>
            <Kop id="jouw-rol" regels={["Wat mag je vragen,", "en wat moet je doen?"]} lead={VRAGEN.lead} />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <VraagKolom {...VRAGEN.mag} kleur={KLEUR.teal} soort="vink" />
              <View style={{ width: 8 }} />
              <VraagKolom {...VRAGEN.magNiet} kleur={ROZE} soort="kruis" />
            </View>
            <View style={{ flexDirection: "row", backgroundColor: "#ffffff", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginTop: 8 }}>
              <Text style={{ width: 130, fontSize: 10.5, fontWeight: 700, color: NAVY }}>{VRAGEN.bedrijfsarts}</Text>
              <Text style={{ flex: 1, fontSize: 7.8, lineHeight: 1.45 }}>{VRAGEN.bedrijfsartsTekst}</Text>
            </View>
          </View>
          <View wrap={false}>
            <View style={{ marginTop: 16 }}>
              <Stiplabel kleur={kleurVan("jouw-rol")}>Per termijn</Stiplabel>
              <View style={{ marginTop: 6 }}><Kopregels maat={18} regels={[["Dezelfde reis, ", NAVY], ["nu met React2u.", kleurVan("jouw-rol")]]} /></View>
              <Text style={{ marginTop: 4, maxWidth: 450 }}>{TERMIJNEN.lead}</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Tijdreis
              haltes={TERMIJNEN.rijen.map((r, i) => ({
                kleur: REIS[i % REIS.length],
                wanneer: r.moment,
                inhoud: (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{r.stap}</Text>
                    <View style={{ flexDirection: "row" }}>
                      <View style={{ flex: 1, backgroundColor: GRIJS, borderRadius: 8, padding: 7, marginRight: 6 }}>
                        <Text style={{ fontSize: 6.6, fontWeight: 700, color: MUTE, letterSpacing: 0.7, textTransform: "uppercase" }}>Jij als werkgever</Text>
                        <Text style={{ fontSize: 8, lineHeight: 1.4, marginTop: 1 }}>{r.jij}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: ZACHT[REIS[i % REIS.length]], borderRadius: 8, padding: 7 }}>
                        <Text style={{ fontSize: 6.6, fontWeight: 700, color: NAVY, letterSpacing: 0.7, textTransform: "uppercase" }}>React2u</Text>
                        <Text style={{ fontSize: 8, color: INKT, lineHeight: 1.4, marginTop: 1 }}>{r.wij}</Text>
                      </View>
                    </View>
                  </View>
                ),
              }))}
            />
          </View>
        </View>

        {/* 07 Tarieven */}
        <PrijslijstHoofdstuk p={prijslijst} />

        {/* 08 Overstappen, de groep en het contact. */}
        <View style={s.hoofdstuk} wrap={false}>
          <Kop id="overstappen" regels={["Zo stap je over."]} lead={OVERSTAP.lead} />
          <View style={{ marginTop: 8 }}>
            <Reis hoog={88} R={24} tekstMaat={8} stations={OVERSTAP.stappen.map((st, i) => {
              const [wanneer, wat] = st.kop.split(/:\s*/);
              return { kleur: [KLEUR.teal, KLEUR.sky, KLEUR.pink][i], teken: String(i + 1), label: wanneer, titel: wat ? wat.charAt(0).toUpperCase() + wat.slice(1) : wanneer, tekst: st.tekst };
            })} />
          </View>
        </View>
        <View wrap={false} style={{ flexDirection: "row", backgroundColor: GRIJS, borderRadius: 14, padding: 14, marginTop: 10 }}>
          <View style={{ flex: 1, paddingRight: 14 }}>
            <Text style={{ fontSize: 11.5, fontWeight: 700, color: NAVY }}>{OVERSTAP.geenDatum}</Text>
            <Text style={{ fontSize: 8.4, marginTop: 3, lineHeight: 1.45 }}>{OVERSTAP.geenDatumTekst}</Text>
          </View>
          <Text style={{ width: 190, fontSize: 8.2, color: NAVY, backgroundColor: "#ffffff", borderRadius: 8, padding: 8, lineHeight: 1.45, alignSelf: "center" }}>{OVERSTAP.or}</Text>
        </View>
        <View wrap={false} style={{ marginTop: 14 }}>
          <Text style={s.tussenkop}>{ZUSTERLABELS.titel}</Text>
          <Text style={{ marginTop: 3, maxWidth: 450 }}>{ZUSTERLABELS.lead}</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {ZUSTERLABELS.labels.map((l, i) => {
              const hier = !l.url;
              return (
                <View key={l.naam} style={{ flex: 1, borderWidth: 0.7, borderColor: hier ? ZACHT[ROZE] : RIJLIJN, backgroundColor: hier ? ZACHT[ROZE] : "#ffffff", borderRadius: 10, padding: 9, marginLeft: i ? 6 : 0 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: 700, color: NAVY }}>{l.naam}</Text>
                  <Text style={{ fontSize: 6.6, fontWeight: 700, color: l.kleur, letterSpacing: 0.7, textTransform: "uppercase" }}>{l.soort}</Text>
                  <Text style={{ fontSize: 7.6, marginTop: 4, lineHeight: 1.4 }}>{l.tekst}</Text>
                  <Text style={{ fontSize: 7.8, fontWeight: 700, color: hier ? ROZE : NAVY, marginTop: 5 }}>{l.url || "Deze brochure"}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View wrap={false} style={{ flexDirection: "row", alignItems: "center", marginTop: 14, backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
          <Rond naam="werkplezier" maat={70} ring={ROZE} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: 700, color: "#ffffff", lineHeight: 1.25 }}>Benieuwd wat het voor {b.bedrijf} betekent? <Text style={{ color: ROZE_LICHT }}>Bel gewoon even.</Text></Text>
            <Text style={{ fontSize: 8, color: "#D6D2F7", marginTop: 4 }}>We horen graag hoe jullie organisatie in elkaar zit. Daarna krijg je een voorstel op maat, dat je online bekijkt en ondertekent.</Text>
            <Text style={{ fontSize: 8.6, color: "#ffffff", fontWeight: 600, marginTop: 6 }}>{afzender}{b.afzender_functie ? `, ${b.afzender_functie}` : ""}{bereik ? ` · ${bereik}` : ""}</Text>
          </View>
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

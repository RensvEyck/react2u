/**
 * De prijslijst in de brochure (Rens, 3 nov 2026: "Ga verder met de brochure.
 * hierbij prijslijst", met de pdf React2u-prijslijst-2027). De bron is
 * dezelfde als die van /verzuimabonnementen en de offertemodule: het blok
 * `dgTarieven`, live uit het CMS en anders uit `src/content/tarieven.json`.
 * Zo loopt de brochure mee als de prijzen per 1 januari veranderen.
 *
 * De indeling volgt de gedrukte prijslijst: de drie aansluitingen, de
 * tarieven per uur, een kaart per label in zijn eigen kleur en tot slot
 * maatwerk en specialisten. Een label met één lijst (Tarieven per uur, Ready)
 * staat in twee kolommen, zoals op papier. De uitlegkaarten van de site
 * ("Zo werkt op offerte") horen bij de site en vallen weg.
 *
 * Puur, zonder database: de pagina, de pdf en de tests gebruiken hetzelfde.
 */
import tarievenJson from "@/content/tarieven.json";
import { BROCHURE_DIENSTEN, type DienstSlug } from "./brochures";
import { MERKEN, type Merk } from "./offerteMerk";
import { geldigheidsregel, normalizeTarieven } from "./tarieven";

export type PrijsRegel = {
  naam: string;
  prijs: string;
  sub?: string;
  /** Een bedrag ("€142,50", "6%") of een woord ("per uur", "op offerte"). */
  bedrag: boolean;
};
export type PrijsLijst = { titel?: string; per?: string; regels: PrijsRegel[] };

export type PrijsGroep = {
  /** Het anker op de pagina: "uur", "recover". */
  id: string;
  /** Alleen bij een label. */
  slug?: DienstSlug;
  /** "Recover", of "Tarieven per uur" voor een groep zonder label. */
  naam: string;
  /** "Verzuimbegeleiding · Trainingen exclusief reistijd en reiskosten." */
  ondertitel?: string;
  kleur: string;
  tekst: string;
  tint: string;
  /** Eén of twee kolommen met lijsten. */
  kolommen: PrijsLijst[][];
  /** De titels van de lijsten tonen: alleen als een groep echt meer lijsten heeft. */
  metTitels: boolean;
};

export type Aansluiting = {
  naam: string;
  badge?: string;
  prijs: string;
  per?: string;
  tekst?: string;
  punten: string[];
  noot?: string;
  /** "Wat je dan per verrichting betaalt": een paar veelgebruikte verrichtingen, op de uitgelichte kaart. */
  voorbeeld?: { kop?: string; regels: { naam: string; prijs: string }[] };
  uitgelicht: boolean;
  bedrag: boolean;
};

export type Prijslijst = {
  jaar: string;
  /** "Tarieven 2027, geldig tot en met 31 december 2027. Alle bedragen zijn exclusief btw." */
  geldigheid: string;
  aansluitingen: Aansluiting[];
  groepen: PrijsGroep[];
  maatwerk?: { titel: string; tekst: string };
};

/** De kleuren van een label; de brochure geeft die van het CMS mee. */
export type LabelKleur = Pick<Merk, "naam" | "kleur" | "tekst" | "tint">;

type Ruw = Record<string, unknown>;
const tekstVan = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const lijstVan = (v: unknown): Ruw[] => (Array.isArray(v) ? v.filter((x): x is Ruw => Boolean(x) && typeof x === "object") : []);

const isBedrag = (prijs: string) => /€|\d\s*%/.test(prijs);
const zonderPunt = (s: string) => s.replace(/\.\s*$/, "");

function regelsUit(lijst: Ruw): PrijsRegel[] {
  return lijstVan(lijst.regels)
    .map((r) => ({ naam: tekstVan(r.naam), prijs: tekstVan(r.prijs), sub: tekstVan(r.sub) || undefined }))
    .filter((r) => r.naam && r.prijs)
    .map((r) => ({ ...r, bedrag: isBedrag(r.prijs) }));
}

function prijsLijsten(kolom: unknown): PrijsLijst[] {
  return lijstVan(kolom)
    .map((l) => ({ titel: tekstVan(l.titel) || undefined, per: tekstVan(l.per) || undefined, regels: regelsUit(l) }))
    .filter((l) => l.regels.length > 0);
}

/** "React2u Recover" → "recover", als het een van de zes labels is. */
function labelUit(eyebrow: string): DienstSlug | undefined {
  const naam = eyebrow.match(/^React2u\s+(\S+)/i)?.[1]?.toLowerCase();
  return (BROCHURE_DIENSTEN as readonly string[]).includes(naam || "") ? (naam as DienstSlug) : undefined;
}

/** "Tarieven 2027" → "2027": het jaar als de instelling er niet is. */
function jaarUit(eyebrow: string): string | undefined {
  return eyebrow.match(/\b(20\d{2})\b/)?.[1];
}

/**
 * Het blok `dgTarieven` als prijslijst voor de brochure. `instelling` is
 * `site_settings.tarieven` (jaar en geldigheid); zonder instelling geldt het
 * jaar uit het bovenkopje van het blok. Geeft null als het blok te weinig
 * bevat om een prijslijst te heten.
 */
export function prijslijstUit(data: unknown, instelling: unknown, kleuren: Partial<Record<DienstSlug, LabelKleur>> = {}): Prijslijst | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Ruw;
  const tarieven = normalizeTarieven(instelling ?? { jaar: jaarUit(tekstVan(d.eyebrow)) });

  const aansluitingen: Aansluiting[] = lijstVan(d.abonnementen)
    .map((a) => {
      const prijs = tekstVan(a.prijs);
      const vb = a.voorbeeld && typeof a.voorbeeld === "object" ? (a.voorbeeld as Ruw) : null;
      const voorbeeldRegels = lijstVan(vb?.regels)
        .map((r) => ({ naam: tekstVan(r.naam), prijs: tekstVan(r.prijs) }))
        .filter((r) => r.naam && r.prijs);
      return {
        naam: tekstVan(a.naam),
        badge: tekstVan(a.badge) || undefined,
        prijs,
        per: tekstVan(a.per) || undefined,
        tekst: tekstVan(a.text) || undefined,
        punten: (Array.isArray(a.points) ? a.points : []).map(tekstVan).filter(Boolean),
        noot: tekstVan(a.note) || undefined,
        voorbeeld: voorbeeldRegels.length ? { kop: tekstVan(vb?.kop) || undefined, regels: voorbeeldRegels } : undefined,
        uitgelicht: a.featured === true,
        bedrag: isBedrag(prijs),
      };
    })
    .filter((a) => a.naam && a.prijs);

  const groepen: PrijsGroep[] = [];
  let maatwerk: Prijslijst["maatwerk"];
  for (const g of lijstVan(d.groepen)) {
    const eyebrow = tekstVan(g.eyebrow);
    const slug = labelUit(eyebrow);
    const links = prijsLijsten(g.links);
    const rechts = prijsLijsten(g.rechts);
    // Een uitlegkaart in een groep zonder label ("Maatwerk en specialisten") is de slotbalk van de prijslijst.
    if (!slug && !maatwerk) {
      const kaart = [...lijstVan(g.links), ...lijstVan(g.rechts)].find((l) => !lijstVan(l.regels).length && tekstVan(l.text));
      if (kaart) maatwerk = { titel: tekstVan(kaart.titel) || "Maatwerk en specialisten", tekst: tekstVan(kaart.text) };
    }
    const alle = [...links, ...rechts];
    if (!alle.length) continue;

    let kolommen: PrijsLijst[][];
    let metTitels = true;
    if (alle.length === 1 && alle[0].regels.length >= 4) {
      // Eén lange lijst: over twee kolommen, de eerste helft links.
      const l = alle[0];
      const helft = Math.ceil(l.regels.length / 2);
      kolommen = [[{ ...l, regels: l.regels.slice(0, helft) }], [{ ...l, regels: l.regels.slice(helft) }]];
      metTitels = false;
    } else {
      kolommen = [links, rechts].filter((k) => k.length);
    }

    const merk = slug ? { ...MERKEN[slug], ...kleuren[slug] } : undefined;
    const kop = zonderPunt(tekstVan(g.heading));
    const uitleg = zonderPunt(tekstVan(g.text));
    groepen.push({
      id: slug || (groepen.length ? `groep-${groepen.length + 1}` : "uur"),
      slug,
      naam: merk ? merk.naam : eyebrow || kop,
      // Bij een label: de dienst en de toelichting, zoals rechtsboven op papier. Zonder label staat de kop niet op papier.
      ondertitel: (merk ? [kop, uitleg] : [uitleg]).filter(Boolean).join(" · ") || undefined,
      kleur: merk?.kleur || tekstVan(g.kleur) || MERKEN.ready.kleur,
      tekst: merk?.tekst || MERKEN.ready.tekst,
      tint: merk?.tint || "#ffffff",
      kolommen,
      metTitels,
    });
  }

  if (!aansluitingen.length && groepen.length < 2) return null;
  return { jaar: tarieven.jaar, geldigheid: geldigheidsregel(tarieven), aansluitingen, groepen, maatwerk };
}

const regelsVan = (g: PrijsGroep) => g.kolommen.flat().reduce((n, l) => n + l.regels.length, 0);

/**
 * De groepen per rij: twee kleine labels na elkaar delen een rij, zoals Reflex
 * en Ready op de gedrukte prijslijst. In de pdf past de prijslijst zo op twee
 * pagina's; op een breed scherm voorkomt het een halflege kaart.
 */
export function prijsRijen(groepen: PrijsGroep[]): PrijsGroep[][] {
  const klein = (g: PrijsGroep | undefined) => Boolean(g?.slug) && regelsVan(g!) <= 8;
  const rijen: PrijsGroep[][] = [];
  for (let i = 0; i < groepen.length; i++) {
    if (klein(groepen[i]) && klein(groepen[i + 1])) {
      rijen.push([groepen[i], groepen[i + 1]]);
      i++;
    } else rijen.push([groepen[i]]);
  }
  return rijen;
}

/** Een groep op halve breedte: de lijsten onder elkaar, een over twee kolommen verdeelde lijst weer als één. */
export function halveKolom(g: PrijsGroep): PrijsLijst[] {
  const lijsten = g.kolommen.flat();
  return g.metTitels || !lijsten.length ? lijsten : [{ ...lijsten[0], regels: lijsten.flatMap((l) => l.regels) }];
}

/** Het blok uit de repo: de terugval als het CMS niets bruikbaars geeft. */
export function prijslijstStandaard(instelling: unknown, kleuren?: Partial<Record<DienstSlug, LabelKleur>>): Prijslijst {
  const blok = (tarievenJson as { blocks: { type: string; data: unknown }[] }).blocks.find((b) => b.type === "dgTarieven");
  return prijslijstUit(blok?.data, instelling, kleuren) as Prijslijst;
}

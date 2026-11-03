import "server-only";
import { getPage, getSetting } from "./content";
import { MERKEN, merkMet, type Merk } from "./offerteMerk";
import { BROCHURE_DIENSTEN, type DienstSlug } from "./brochures";
import { prijslijstStandaard, prijslijstUit, type Prijslijst } from "./brochurePrijslijst";

/**
 * De zes diensten zoals de brochure ze laat zien: de branding van het label
 * (kleur, tint, dienst, tagline, punten) plus de korte tekst van de
 * labelpagina, allemaal uit het dienstLabel-blok in het CMS. Zo zegt de
 * brochure hetzelfde als de site, en loopt hij mee als een tekst daar
 * verandert. Lukt het ophalen niet, dan de vaste gegevens hieronder: een
 * brochure mag niet stuklopen op het CMS.
 */
export type Dienst = Merk & {
  slug: DienstSlug;
  /**
   * De korte omschrijving van de dienst (het veld `text` van de labelpagina).
   * Niet `tekst`: dat is in Merk de tekstkleur van het label.
   */
  omschrijving: string;
  /** De pagina op de site. */
  href: string;
};

const TEKST: Record<DienstSlug, string> = {
  recover: "Verzuimbegeleiding door een vaste casemanager, van de eerste ziekmelding tot herstel. Met bedrijfsarts, taakdelegatie en één online dossier.",
  resist: "Uitval voorkomen vóór de ziekmelding: RI&E, preventief medisch onderzoek, werkplekonderzoek en trainingen voor leidinggevenden.",
  restart: "Samen weer vooruit: tweede spoor, loopbaanscan, coaching en arbeidsdeskundig onderzoek.",
  reflex: "Voor uitzendbureaus en eigenrisicodragers Ziektewet. We begeleiden zieke flexkrachten, ook na het einde van het dienstverband.",
  ready: "HR en arbeidsrecht: helder advies rond verzuim, contracten en conflicten, snel geregeld.",
  reward: "Salaris en verloning door mensen die verzuim kennen: per maand of per vier weken, ook bij ziekte.",
};

export async function brochureDiensten(): Promise<Dienst[]> {
  return Promise.all(
    BROCHURE_DIENSTEN.map(async (slug): Promise<Dienst> => {
      const basis = MERKEN[slug];
      let data: Record<string, unknown> | null = null;
      try {
        const pagina = await getPage(slug);
        data = (pagina?.blocks.find((b) => b.type === "dienstLabel")?.data as Record<string, unknown> | undefined) ?? null;
      } catch {
        data = null;
      }
      const omschrijving = typeof data?.text === "string" && data.text.trim() ? data.text.trim() : TEKST[slug];
      return { ...merkMet(basis, data), slug, omschrijving, href: `/${slug}` };
    }),
  );
}

/**
 * De prijslijst zoals hij live staat: het blok `dgTarieven` op
 * /verzuimabonnementen en het jaar uit Instellingen → Tarievenjaar, in de
 * kleuren van de diensten hierboven. Lukt het ophalen niet, dan de versie uit
 * de repo; ook de prijslijst mag een brochure niet laten stuklopen.
 */
export async function brochurePrijslijst(diensten: Dienst[]): Promise<Prijslijst> {
  const kleuren = Object.fromEntries(diensten.map((d) => [d.slug, d]));
  let data: unknown = null;
  let instelling: unknown = null;
  try {
    const [pagina, tarieven] = await Promise.all([getPage("verzuimabonnementen"), getSetting<unknown>("tarieven")]);
    data = pagina?.blocks.find((b) => b.type === "dgTarieven")?.data ?? null;
    instelling = tarieven;
  } catch {
    data = null;
  }
  return prijslijstUit(data, instelling, kleuren) ?? prijslijstStandaard(instelling, kleuren);
}

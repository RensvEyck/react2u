/*
 * Het werkgebied: alle 342 gemeenten van Nederland (indeling 2025/2026), per
 * regio en provincie. Voedt de sitemap (/sitemap#werkgebied), de pagina's
 * /arbodienst-provincie-<provincie> en /arbodienst-<gemeente> en sitemap.xml.
 * Gaat er een gemeentelijke herindeling in, pas dan alleen deze lijst aan.
 */

export type Provincie = { naam: string; gemeenten: string[] };
export type Regio = { regio: string; kleur: string; provincies: Provincie[] };

export const REGIOS: Regio[] = [
  {
    regio: "Zuid-Nederland",
    kleur: "#E61674",
    provincies: [
      { naam: "Noord-Brabant", gemeenten: ["'s-Hertogenbosch", "Alphen-Chaam", "Altena", "Asten", "Baarle-Nassau", "Bergeijk", "Bergen op Zoom", "Bernheze", "Best", "Bladel", "Boekel", "Boxtel", "Breda", "Cranendonck", "Deurne", "Dongen", "Drimmelen", "Eersel", "Eindhoven", "Etten-Leur", "Geertruidenberg", "Geldrop-Mierlo", "Gemert-Bakel", "Gilze en Rijen", "Goirle", "Halderberge", "Heeze-Leende", "Helmond", "Heusden", "Hilvarenbeek", "Laarbeek", "Land van Cuijk", "Loon op Zand", "Maashorst", "Meierijstad", "Moerdijk", "Nuenen c.a.", "Oirschot", "Oisterwijk", "Oosterhout", "Oss", "Reusel-De Mierden", "Roosendaal", "Rucphen", "Sint-Michielsgestel", "Someren", "Son en Breugel", "Steenbergen", "Tilburg", "Valkenswaard", "Veldhoven", "Vught", "Waalre", "Waalwijk", "Woensdrecht", "Zundert"] },
      { naam: "Limburg", gemeenten: ["Beek", "Beekdaelen", "Beesel", "Bergen (L)", "Brunssum", "Echt-Susteren", "Eijsden-Margraten", "Gennep", "Gulpen-Wittem", "Heerlen", "Horst aan de Maas", "Kerkrade", "Landgraaf", "Leudal", "Maasgouw", "Maastricht", "Meerssen", "Mook en Middelaar", "Nederweert", "Peel en Maas", "Roerdalen", "Roermond", "Simpelveld", "Sittard-Geleen", "Stein", "Vaals", "Valkenburg aan de Geul", "Venlo", "Venray", "Voerendaal", "Weert"] },
      { naam: "Zeeland", gemeenten: ["Borsele", "Goes", "Hulst", "Kapelle", "Middelburg", "Noord-Beveland", "Reimerswaal", "Schouwen-Duiveland", "Sluis", "Terneuzen", "Tholen", "Veere", "Vlissingen"] },
    ],
  },
  {
    regio: "Oost-Nederland",
    kleur: "#00A098",
    provincies: [
      { naam: "Gelderland", gemeenten: ["Aalten", "Apeldoorn", "Arnhem", "Barneveld", "Berg en Dal", "Berkelland", "Beuningen", "Bronckhorst", "Brummen", "Buren", "Culemborg", "Doesburg", "Doetinchem", "Druten", "Duiven", "Ede", "Elburg", "Epe", "Ermelo", "Harderwijk", "Hattem", "Heerde", "Heumen", "Lingewaard", "Lochem", "Maasdriel", "Montferland", "Neder-Betuwe", "Nijkerk", "Nijmegen", "Nunspeet", "Oldebroek", "Oost Gelre", "Oude IJsselstreek", "Overbetuwe", "Putten", "Renkum", "Rheden", "Rozendaal", "Scherpenzeel", "Tiel", "Voorst", "Wageningen", "West Betuwe", "West Maas en Waal", "Westervoort", "Wijchen", "Winterswijk", "Zaltbommel", "Zevenaar", "Zutphen"] },
      { naam: "Overijssel", gemeenten: ["Almelo", "Borne", "Dalfsen", "Deventer", "Dinkelland", "Enschede", "Haaksbergen", "Hardenberg", "Hellendoorn", "Hengelo", "Hof van Twente", "Kampen", "Losser", "Oldenzaal", "Olst-Wijhe", "Ommen", "Raalte", "Rijssen-Holten", "Staphorst", "Steenwijkerland", "Tubbergen", "Twenterand", "Wierden", "Zwartewaterland", "Zwolle"] },
    ],
  },
  {
    regio: "Midden-Nederland en Randstad",
    kleur: "#3AA5DD",
    provincies: [
      { naam: "Utrecht", gemeenten: ["Amersfoort", "Baarn", "Bunnik", "Bunschoten", "De Bilt", "De Ronde Venen", "Eemnes", "Houten", "IJsselstein", "Leusden", "Lopik", "Montfoort", "Nieuwegein", "Oudewater", "Renswoude", "Rhenen", "Soest", "Stichtse Vecht", "Utrecht", "Utrechtse Heuvelrug", "Veenendaal", "Vijfheerenlanden", "Wijk bij Duurstede", "Woerden", "Woudenberg", "Zeist"] },
      { naam: "Zuid-Holland", gemeenten: ["Alblasserdam", "Albrandswaard", "Alphen aan den Rijn", "Barendrecht", "Bodegraven-Reeuwijk", "Capelle aan den IJssel", "Delft", "Den Haag", "Dordrecht", "Goeree-Overflakkee", "Gorinchem", "Gouda", "Hardinxveld-Giessendam", "Hendrik-Ido-Ambacht", "Hillegom", "Hoeksche Waard", "Kaag en Braassem", "Katwijk", "Krimpen aan den IJssel", "Krimpenerwaard", "Lansingerland", "Leiden", "Leiderdorp", "Leidschendam-Voorburg", "Lisse", "Maassluis", "Midden-Delfland", "Molenlanden", "Nieuwkoop", "Nissewaard", "Noordwijk", "Oegstgeest", "Papendrecht", "Pijnacker-Nootdorp", "Ridderkerk", "Rijswijk", "Rotterdam", "Schiedam", "Sliedrecht", "Teylingen", "Vlaardingen", "Voorne aan Zee", "Voorschoten", "Waddinxveen", "Wassenaar", "Westland", "Zoetermeer", "Zoeterwoude", "Zuidplas", "Zwijndrecht"] },
      { naam: "Noord-Holland", gemeenten: ["Aalsmeer", "Alkmaar", "Amstelveen", "Amsterdam", "Bergen (NH)", "Beverwijk", "Blaricum", "Bloemendaal", "Castricum", "Den Helder", "Diemen", "Dijk en Waard", "Drechterland", "Edam-Volendam", "Enkhuizen", "Gooise Meren", "Haarlem", "Haarlemmermeer", "Heemskerk", "Heemstede", "Heiloo", "Hilversum", "Hollands Kroon", "Hoorn", "Huizen", "Koggenland", "Landsmeer", "Laren (NH)", "Medemblik", "Oostzaan", "Opmeer", "Ouder-Amstel", "Purmerend", "Schagen", "Stede Broec", "Texel", "Uitgeest", "Uithoorn", "Velsen", "Waterland", "Wijdemeren", "Wormerland", "Zaanstad", "Zandvoort"] },
      { naam: "Flevoland", gemeenten: ["Almere", "Dronten", "Lelystad", "Noordoostpolder", "Urk", "Zeewolde"] },
    ],
  },
  {
    regio: "Noord-Nederland",
    kleur: "#F19001",
    provincies: [
      { naam: "Groningen", gemeenten: ["Eemsdelta", "Groningen", "Het Hogeland", "Midden-Groningen", "Oldambt", "Pekela", "Stadskanaal", "Veendam", "Westerkwartier", "Westerwolde"] },
      { naam: "Friesland", gemeenten: ["Achtkarspelen", "Ameland", "Dantumadiel", "De Fryske Marren", "Harlingen", "Heerenveen", "Leeuwarden", "Noardeast-Fryslân", "Ooststellingwerf", "Opsterland", "Schiermonnikoog", "Smallingerland", "Súdwest-Fryslân", "Terschelling", "Tytsjerksteradiel", "Vlieland", "Waadhoeke", "Weststellingwerf"] },
      { naam: "Drenthe", gemeenten: ["Aa en Hunze", "Assen", "Borger-Odoorn", "Coevorden", "De Wolden", "Emmen", "Hoogeveen", "Meppel", "Midden-Drenthe", "Noordenveld", "Tynaarlo", "Westerveld"] },
    ],
  },
];

/** "Nuenen c.a." wordt "nuenen-ca", "'s-Hertogenbosch" wordt "s-hertogenbosch", "Súdwest-Fryslân" wordt "sudwest-fryslan". */
export function slugVan(naam: string): string {
  return naam
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type Plaats = { naam: string; slug: string; provincie: Provincie; regio: Regio };

const PLAATSEN: Plaats[] = REGIOS.flatMap((regio) =>
  regio.provincies.flatMap((provincie) => provincie.gemeenten.map((naam) => ({ naam, slug: slugVan(naam), provincie, regio }))),
);

/** Het adres van een gemeentepagina, bijvoorbeeld /arbodienst-eindhoven. */
export const plaatsHref = (naam: string) => `/arbodienst-${slugVan(naam)}`;
/**
 * Het adres van een provinciepagina. Met "provincie-" ervoor, want Utrecht en
 * Groningen zijn zowel provincie als gemeente.
 */
export const provincieHref = (naam: string) => `/arbodienst-provincie-${slugVan(naam)}`;

export function plaatsVoorSlug(slug: string): Plaats | null {
  return PLAATSEN.find((p) => p.slug === slug) ?? null;
}

export function provincieVoorSlug(slug: string): { provincie: Provincie; regio: Regio } | null {
  for (const regio of REGIOS) {
    const provincie = regio.provincies.find((p) => slugVan(p.naam) === slug);
    if (provincie) return { provincie, regio };
  }
  return null;
}

/** Alle adressen van het werkgebied, voor sitemap.xml. */
export function werkgebiedPaden(): string[] {
  return [
    ...REGIOS.flatMap((r) => r.provincies.map((p) => provincieHref(p.naam))),
    ...PLAATSEN.map((p) => `/arbodienst-${p.slug}`),
  ];
}

export const AANTAL_GEMEENTEN = PLAATSEN.length;
export const AANTAL_PROVINCIES = REGIOS.reduce((n, r) => n + r.provincies.length, 0);

/*
 * De tekst van het Basiscontract Arbodienstverlening (migratie 0031), uit het
 * Word-bestand "Basiscontract arbodienst React2u LEEG nieuw" van november 2026.
 * De inhoud is letterlijk overgenomen; alleen de opmaak is die van de site.
 *
 * De kop met de partijen ("De ondergetekenden") staat hier niet: die maakt de
 * code uit de gegevens van React2u (Instellingen) en van de klant
 * (lib/contracten.ts, comparitie()). De ondertekening ook niet.
 *
 * Opmaak, één regel per onderdeel:
 *   # Kop               de kop boven de overwegingen ("In aanmerking nemende")
 *   A. tekst            een overweging
 *   ## 1. Titel         een artikel
 *   1.1. tekst          een bepaling; 3.1.1. is een bepaling binnen 3.1
 *   andere regel        een volgende alinea van de bepaling of overweging erboven
 *   **vet**, [link](…)  binnen een regel (lib/mdInline.ts)
 * Invulvelden: {ingangsdatum}, {einddatum} en {offerte} (contractVelden()).
 *
 * Elk contract krijgt bij het aanmaken een kopie van deze tekst (kolom
 * `tekst`): een latere wijziging hier verandert een verstuurd contract niet.
 * Pas de versie aan als je de tekst wijzigt.
 */

export const CONTRACT_VERSIE = "november 2026";

export const CONTRACT_TITEL = "Basiscontract Arbodienstverlening";

export const CONTRACT_STANDAARD = `# In aanmerking nemende

A. Dat Opdrachtnemer een gecertificeerde Arbodienst is die activiteiten verricht in het kader van het optimaliseren van de gezondheid en inzetbaarheid van de medewerkers bij haar klanten: “werken aan gezondheid”. Opdrachtnemer doet dit door de inzet van professionals, onder andere en niet beperkt tot: bedrijfsartsen, casemanagers, arbo-deskundigen en verzuimcoaches, gedurende het continuüm van gezondheidsmanagement welke bestaat uit advisering op het gebied van arbo-, re-integratie- en verzuimbeleid; Zoals beschreven in artikel 14, lid 4 van de Arbeidsomstandighedenwet.

B. Dat Opdrachtnemer de kern-/wettelijke taken die horen bij arbodienstverlening, zijnde: ziekteverzuimbegeleiding, uitvoering PAGO/PMO, aanstellingskeuring, consultatie bedrijfsarts en toetsing van c.q. adviseren over de RI&E in opdracht van Opdrachtgever voor haar rekening kan nemen;

C. Dat Opdrachtgever dienstverlening van Opdrachtnemer wenst af te nemen conform de vangnetregeling en dat de Ondernemingsraad of Personeelsvertegenwoordiging (indien aanwezig) instemt met deze keuze;

D. Dat Opdrachtgever akkoord is met de offerte voor de dienstverlening van Opdrachtnemer, met kenmerk: {offerte}.

E. Dat Opdrachtnemer bereid en in staat is tot het verlenen van diensten en het leveren van producten aan Opdrachtgever conform gesteld in de Offerte en zoals in de overeenkomst (hierna: de Overeenkomst) nader bepaald;

F. Dat deze overeenkomst voldoet aan de eisen gesteld aan het Basiscontract Arbodienstverlening in de gewijzigde Arbowet per 1 juli 2017;

## 1. Duur van de overeenkomst en opzegging

1.1. De Overeenkomst start op {ingangsdatum} en heeft als einddatum {einddatum}. De Overeenkomst dient middels een aangetekend schrijven uiterlijk 3 maanden voor einddatum te worden opgezegd. Na de einddatum wordt de Overeenkomst telkens stilzwijgend voor een periode van 12 maanden verlengd, tenzij deze (met inachtneming van een opzegtermijn van 3 maanden) is opgezegd.

## 2. Inhoud dienstverlening

2.1. Opdrachtgever wenst gebruik te maken van de diensten en producten van Opdrachtnemer op basis van hetgeen in de offerte met elkaar is overeengekomen.

## 3. Uitvoering kerntaken

3.1. **Ziekteverzuimbegeleiding.** Bij ziekteverzuimbegeleiding gaat het om het bevorderen van re-integratie bij verzuim wegens ziekte of gebrek;

3.1.1. De bedrijfsarts heeft een adviserende rol in de verzuimbegeleiding; Opdrachtgever (als werkgever) blijft verantwoordelijk voor de begeleiding van de werknemers en wordt daarbij geadviseerd door de bedrijfsarts;

3.2. **Toetsen van en adviseren over de Risico-inventarisatie en -evaluatie (RI&E).** De RI&E is een middel om de gezondheid en veiligheid binnen de organisatie te bevorderen. Elk bedrijf met personeel moet (laten) inventariseren welke omstandigheden in het werk gevaarlijk of ongezond kunnen zijn voor medewerkers. Een uitgevoerde RI&E dient door een externe kerndeskundige te worden getoetst. Opdrachtnemer, als gecertificeerde Arbodienst, kan dit (evenals de uitvoering) in opdracht van Opdrachtgever voor haar rekening nemen;

3.3. **Uitvoeren en adviseren over arbeidsgezondheidskundig onderzoek (PAGO/PMO).** Het arbeidsgezondheidskundig onderzoek is erop gericht de risico's die de arbeid voor de gezondheid van de werknemers met zich brengt zoveel mogelijk te voorkomen of te beperken. Opdrachtgever (als werkgever) is verplicht om een arbeidsgezondheidskundig onderzoek aan te bieden; de werknemer bepaalt zelf of hij daarvan gebruik maakt. Opdrachtgever kan Opdrachtnemer verzoeken om een voorstel te doen tot uitvoering van arbeidsgezondheidskundig onderzoeken. Naar aanleiding van deze onderzoeken brengt de Opdrachtnemer adviezen uit aan de werkende (op individueel niveau) en (optioneel) aan de organisatie (op groepsniveau);

3.4. **Uitvoeren aanstellingskeuringen.** Een aanstellingskeuring kan worden uitgevoerd om de medische geschiktheid van een sollicitant voor het vervullen van een functie te onderzoeken. Aanstellingskeuringen mogen alleen worden uitgevoerd wanneer aan de functie bijzondere eisen op het punt van medische geschiktheid worden gesteld;

3.5. **Mogelijkheid voor werknemer tot consulteren van de bedrijfsarts (arbeidsomstandigheden-/open spreekuur).** Alle werknemers (ook oproepkrachten, uitzendkrachten en tijdelijke contractanten) van Opdrachtgever krijgen de gelegenheid om een bedrijfsarts (uitgangspunt is de ‘eigen bedrijfsarts’) van Opdrachtnemer te consulteren over individuele, persoonsgerichte gezondheidsvragen in relatie tot het werk. Dit contact moet anoniem kunnen en er is geen toestemming van Opdrachtgever (als werkgever) nodig. Het gaat hierbij nadrukkelijk niet over aan verzuim gerelateerde vragen, maar juist over preventie, arbeidsomstandigheden en veiligheid op de werkplek. Het aanvragen van een open spreekuur kan direct via e-mail of telefoon van Opdrachtnemer.

## 4. Beroepsuitoefening van de bedrijfsarts

4.1. Om optimaal invulling te kunnen geven aan de arbeid gerelateerde zorg, of het nu gaat om preventie of om re-integratie bij ziekteverzuim, is een goed inzicht in de arbeidsomstandigheden en de belasting in het werk essentieel. Derhalve krijgt de bedrijfsarts van Opdrachtnemer van Opdrachtgever én werknemer de mogelijk- en gelegenheid om (indien hij/zij hier aanleiding toe ziet) een werkplek te bezoeken. Dit bezoek stemt de bedrijfsarts met Opdrachtgever en werknemer af;

4.2. De bedrijfsarts kan een deel van zijn taken, bevoegdheden en verantwoordelijkheden in de verzuimbegeleiding delegeren aan een andere medewerker, zoals een casemanager taakdelegatie of praktijkondersteuner bedrijfsarts. De bedrijfsarts blijft zelf altijd verantwoordelijk voor de medische aspecten van de verzuimbegeleiding;

4.3. Een medewerker kan het door de bedrijfsarts gegeven advies laten beoordelen door een andere bedrijfsarts indien de werknemer twijfelt aan de juistheid van het door de bedrijfsarts gegeven advies. Dit noemt men de ‘second opinion’. Het gaat hier om adviezen in het kader van: de verzuimbegeleiding, een uitgevoerd arbeidsgezondheidskundig onderzoek of een preventieve consultatie met betrekking tot een gezondheidskundig vraagstuk in verband met arbeid. De uitvoering van de second opinion vindt plaats door:
Een bedrijfsarts die bekend is met het uitvoeren van Second Opinion en werkzaam is voor een partij die bekend zijn met het uitvoeren van Second Opinion zoals Aditum Arbo.

4.4. Opdrachtnemer hanteert een klachtenprocedure (dit is een verplichting op grond van de certificatieregeling Arbodiensten) en is aangesloten bij advocatenkantoor Snijders advocaten te ‘s-Hertogenbosch. De klachtenprocedure is, evenals het klachtenformulier, te downloaden via de website van Opdrachtnemer. Voor inzage, vragen en/of opmerkingen hierover kan een medewerker (of Opdrachtgever) contact opnemen met Opdrachtnemer;

4.5. De bedrijfsarts heeft het recht om overleg te voeren met de preventiemedewerker(s), Ondernemingsraad en/of Personeelsvertegenwoordiging van Opdrachtgever. Hierdoor krijgt de bedrijfsarts meer mogelijkheden betrokken te raken bij het bedrijfsbeleid voor gezond en veilig werken. Initiatief voor dit overleg kan bij alle betrokkenen liggen;

4.6. De bedrijfsarts wordt door Opdrachtgever betrokken bij het voorkomen, signaleren en – waar mogelijk – behandelen van beroepsziekten en beroeps gebonden aandoeningen. De bedrijfsarts krijgt van Opdrachtgever voldoende tijd beschikbaar om te voldoen aan de wettelijke meldingsplicht van beroepsziekten bij het Nederlands Centrum voor Beroepsziekten (NCvB). Uitvoeren en toetsen van een RI&E, aanbieden van Preventief Medisch Onderzoeken en melden van beroepsziekten bij het Nederlands Centrum voor Beroepsziekten (NCvB) door de bedrijfsartsen zijn voorbeelden van concrete acties;

4.7. De bedrijfsarts adviseert Opdrachtgever over aanpassing van het arbobeleid en schakelt voor deze advisering waar nodig andere (kern)deskundigen in. Inschakelen van derden geschiedt na overleg met Opdrachtgever;

4.8. De bedrijfsarts werkt conform professionele normen en geldende NVAB-richtlijnen.

## 5. Randvoorwaarden

5.1. **Onafhankelijkheid.** Werknemers én werkgevers kunnen vertrouwen op de onafhankelijkheid van de bedrijfsarts. Opdrachtnemer trekt geen partij voor en weegt vanuit zijn/haar professionele deskundigheid de gezondheidsproblematiek en de overige relevante factoren af om tot een onafhankelijk advies te komen;

5.2. **Privacy.** Opdrachtnemer heeft een privacyreglement (met omschrijving van registraties, op welke manier, op basis van welke grondslag en met welk doel gegevens van werknemers worden vastgelegd) gratis op haar website beschikbaar. Uitwisseling van gegevens over de werknemer tussen de Opdrachtgever (als werkgever) en Opdrachtnemer /bedrijfsarts zijn conform dit reglement en conform geldende privacyregels;

5.3. **Verwerking persoonsgegevens** (zie ook privacyreglement).

5.3.1. Opdrachtnemer verleent voor Opdrachtgever diensten, waarbij Opdrachtnemer voor en ten behoeve van Opdrachtgever persoonsgegevens als bedoeld in de Algemene Verordening Gegevensverwerking verwerkt;

5.3.2. Opdrachtnemer zal in het kader van de uitvoering van de overeengekomen werkzaamheden ten behoeve van Opdrachtgever persoonsgegevens verwerken, waarbij het Opdrachtnemer niet is toegestaan de van Opdrachtgever verkregen persoonsgegevens voor eigen doeleinden, anders dan overeengekomen, te verwerken;

5.3.3. Partijen verplichten zich over en weer conform de Algemene Verordening Gegevensverwerking en overige (toekomstige) relevante wet- en regelgeving te handelen;

5.3.4. Opdrachtnemer zal passende technische en organisatorische maatregelen nemen, in stand houden en zo nodig aanpassen om de persoonsgegevens van de Opdrachtgever te beveiligen om onrechtmatige verwerking te voorkomen. Dit gebeurt onder andere door het nemen van zowel technische maatregelen als organisatorische maatregelen;

5.3.5. Opdrachtnemer mag de gegevens niet (laten) verwerken buiten de Europese Unie, tenzij dat gebeurt in een land met een door de Europese Commissie vastgesteld passend beschermingsniveau of op basis van een door de Europese Commissie goedgekeurde ‘model clause’;

5.3.6. Opdrachtnemer is verplicht de van Opdrachtgever verkregen persoonsgegevens geheim te houden en van haar betrokken personeelsleden en betrokken derden hetzelfde te bedingen. Voorts draagt Opdrachtnemer er zorg voor dat de hiervoor bedoelde persoonsgegevens onverwijld na beëindiging van onderhavige overeenkomst, of zoveel eerder als dat mogelijk is, vernietigd worden;

5.3.7. Als er een security-incident ontdekt is waarbij mogelijk persoonsgegevens zijn uitgelekt of verloren gegaan (een ‘data lek’), zal Opdrachtnemer binnen 3x 24 uur een medewerker van Opdrachtgever telefonisch en per email op de hoogte brengen, zodat Opdrachtgever kan inschatten of er een melding gedaan moet worden aan de Autoriteit Persoonsgegevens of betrokkenen. Opdrachtnemer zal vervolgens alle instructies voortkomend uit het onderzoek van het incident zo snel en goed mogelijk uitvoeren;

5.4. **Beheer van medische gegevens** (zie ook Rijksoverheid).

5.4.1. Medische gegevens worden op een technisch en organisatorisch veilige manier onder verantwoordelijkheid van Opdrachtnemer /bedrijfsarts opgeslagen en beheerd. Dit geldt zowel bij het bewaren van medische dossiers in eigen systemen van Opdrachtnemer als bij gebruikmaking van een extern verzuimsysteem (een systeem door een externe partij beheerd) in opdracht van Opdrachtgever. In dit laatste geval draagt Opdrachtgever er zorg voor dat Opdrachtnemer met de leverancier van dit extern verzuimsysteem een verwerkersovereenkomst af kan sluiten;

5.4.2. Medische gegevens worden op een technisch en organisatorisch veilige manier uitgewisseld (met toestemming van de werknemer) met de behandelaar of vervanger/opvolger van de bedrijfsarts.

## 6. Overige

6.1. De bedrijfsarts coördineert in overleg met Opdrachtgever de ondersteuning door andere arbo-deskundigen, (para)medische instanties, het UWV, re-integratiedeskundigen, etc.

## 7. Vergoeding(en) en betalingscondities

7.1. Ter zake de dienstverlening zoals vermeld in deze Overeenkomst heeft Opdrachtnemer jegens de Opdrachtgever aanspraak op een honorarium zoals opgenomen in de Offerte of zoals opgenomen in aanvullende offertes/afspraken;

7.2. De kosten voor de second opinion zoals onder artikel 4, worden 1 op 1 doorbelast aan de Opdrachtgever

7.3. Kosten die verbonden zijn aan het inschakelen van derden op grond van een (wettelijke) regeling en kosten die gemoeid zijn met het uitoefenen van de verwijsfunctie van de bedrijfsarts worden een-op-een aan Opdrachtgever doorbelast;

7.4. Facturen van Opdrachtnemer worden digitaal verzonden en dienen binnen 30 dagen na factuurdatum te zijn betaald.

## 8. Slotbepalingen

8.1. Op deze overeenkomst zijn de algemene voorwaarden van Opdrachtnemer van toepassing, deze treft u aan op onze website www.react2u.nl. Bij ondertekening van deze overeenkomst gaat u akkoord met deze voorwaarden. In het geval dat de inkoopvoorwaarden van Opdrachtgever in strijd zijn met de algemene voorwaarden van Opdrachtnemer, dan prevaleren de algemene voorwaarden van Opdrachtnemer boven de inkoopvoorwaarden van Opdrachtgever;

8.2. Op het geheel of gedeeltelijke geautomatiseerd verwerken van persoonsgegevens, alsmede op de niet geautomatiseerde verwerking van persoonsgegevens die in een bestand zijn opgenomen of die bestemd zijn om daarin te worden opgenomen, is ons privacyreglement van toepassing. Dit reglement treft u hierbij aan en is tevens beschikbaar op onze website (www.react2u.nl);

8.3. Op deze Overeenkomst is Nederlands recht van toepassing. Alle geschillen voortvloeiende uit of verband houdende met deze overeenkomst en haar uitvoering zullen worden voorgelegd aan de burgerlijke rechter in het arrondissement ‘s-Hertogenbosch.`;

/** De zin boven de handtekeningen, zoals in het Word-bestand. */
export const CONTRACT_SLOT = "Aldus overeengekomen en ondertekend op de data en plaatsen zoals hierna vermeld.";

/* ---------- structuur ---------- */

export type Overweging = { letter: string; alineas: string[] };
export type Bepaling = { nr: string; alineas: string[]; diepte: number };
export type Artikel = { nr: string; titel: string; bepalingen: Bepaling[] };
export type ContractStructuur = { overwegingenKop: string; overwegingen: Overweging[]; artikelen: Artikel[] };

const ARTIKEL = /^##\s+(\d+)\.?\s+(.+)$/;
const KOP = /^#\s+(.+)$/;
const OVERWEGING = /^([A-Z])\.\s+(.+)$/;
const BEPALING = /^(\d+(?:\.\d+)+)\.?\s+(.+)$/;

/**
 * De tekst als overwegingen en artikelen met bepalingen. Wat niet in een
 * artikel of overweging past (tekst vóór de eerste kop), komt als losse
 * alinea in de overwegingen, zodat er nooit tekst verdwijnt.
 */
export function contractStructuur(tekst: string): ContractStructuur {
  const uit: ContractStructuur = { overwegingenKop: "In aanmerking nemende", overwegingen: [], artikelen: [] };
  let laatste: { alineas: string[] } | null = null;
  for (const ruw of (tekst || "").replace(/\r\n?/g, "\n").split("\n")) {
    const regel = ruw.trim();
    if (!regel) continue;
    const artikel = regel.match(ARTIKEL);
    const kop = !artikel && regel.match(KOP);
    const bepaling = regel.match(BEPALING);
    const overweging = !uit.artikelen.length && regel.match(OVERWEGING);
    if (artikel) {
      uit.artikelen.push({ nr: artikel[1], titel: artikel[2].trim(), bepalingen: [] });
      laatste = null;
    } else if (kop) {
      uit.overwegingenKop = kop[1].trim();
      laatste = null;
    } else if (bepaling && uit.artikelen.length) {
      const b: Bepaling = { nr: bepaling[1], alineas: [bepaling[2].trim()], diepte: bepaling[1].split(".").length - 1 };
      uit.artikelen[uit.artikelen.length - 1].bepalingen.push(b);
      laatste = b;
    } else if (overweging) {
      const o: Overweging = { letter: overweging[1], alineas: [overweging[2].trim()] };
      uit.overwegingen.push(o);
      laatste = o;
    } else if (laatste) {
      laatste.alineas.push(regel);
    } else if (uit.artikelen.length) {
      // Een alinea direct onder de kop van een artikel: een bepaling zonder nummer.
      const b: Bepaling = { nr: "", alineas: [regel], diepte: 1 };
      uit.artikelen[uit.artikelen.length - 1].bepalingen.push(b);
      laatste = b;
    } else {
      const o: Overweging = { letter: "", alineas: [regel] };
      uit.overwegingen.push(o);
      laatste = o;
    }
  }
  return uit;
}

/**
 * De aanvullende afspraken van één contract als laatste artikel, na de
 * slotbepalingen: elke alinea een eigen bepaling (9.1, 9.2, ...).
 */
export function metAanvullend(s: ContractStructuur, aanvullend: string | null | undefined): ContractStructuur {
  const alineas = (aanvullend || "").split(/\n\s*\n/).map((a) => a.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  if (!alineas.length) return s;
  const nr = String((Number(s.artikelen[s.artikelen.length - 1]?.nr) || s.artikelen.length) + 1);
  return {
    ...s,
    artikelen: [...s.artikelen, { nr, titel: "Aanvullende afspraken", bepalingen: alineas.map((a, i) => ({ nr: `${nr}.${i + 1}`, alineas: [a], diepte: 1 })) }],
  };
}

/** De invulvelden van de tekst. */
export type ContractVelden = { ingangsdatum: string; einddatum: string; offerte: string };

export function vulContractIn(tekst: string, v: ContractVelden): string {
  return (tekst || "")
    .replace(/\{ingangsdatum\}/g, v.ingangsdatum)
    .replace(/\{einddatum\}/g, v.einddatum)
    .replace(/\{offerte\}/g, v.offerte);
}

/** Of de tekst van een contract afwijkt van de standaard (witruimte telt niet mee). */
export function wijktAf(tekst: string | null | undefined): boolean {
  const schoon = (t: string) => t.replace(/\s+/g, " ").trim();
  return schoon(tekst || "") !== schoon(CONTRACT_STANDAARD);
}

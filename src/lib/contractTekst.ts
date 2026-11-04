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

/*
 * De Resellerovereenkomst arbodienstverlening (migratie 0033), uit het
 * Word-bestand "Resellerovereenkomst React2u - model" van november 2026, in
 * dezelfde opmaak. De leden van een artikel ("artikel 8 lid 3") heten hier 8.3;
 * de onderdelen a en b van 3.1 zijn alinea's van die bepaling. Vet zijn alleen
 * de begrippen in artikel 1.
 *
 * Niet in de tekst, net als bij het basiscontract: de partijen (die maakt de
 * code, lib/contracten.ts), "hierna gezamenlijk: Partijen", "Partijen komen het
 * volgende overeen:" en de ondertekening (CONTRACT_SOORT in lib/contracten.ts).
 *
 * De percentages in 3.1 zijn die van het Word-bestand; een overeenkomst voor
 * een partner krijgt bij het aanmaken de percentages van die partner
 * (resellerTekst()). Invulvelden zijn er niet: de overeenkomst gaat in op de
 * dag van ondertekening en loopt voor onbepaalde tijd.
 */

export const RESELLER_VERSIE = "november 2026";

export const RESELLER_TITEL = "Resellerovereenkomst arbodienstverlening";

export const RESELLER_STANDAARD = `# Overwegingen

A. React2u is een gecertificeerde arbodienst die werkgevers ondersteunt bij verzuimbegeleiding, re-integratie en preventie.

B. Reseller heeft in het kader van haar eigen dienstverlening contact met werkgevers die behoefte hebben aan arbodienstverlening.

C. Reseller wil werkgevers aanbrengen bij React2u, en React2u wil Reseller daarvoor een vergoeding betalen.

D. Partijen kiezen bewust voor een vrije vorm van samenwerking, zonder exclusiviteit en zonder afname- of aanbrengverplichting.

E. Partijen willen de voorwaarden van deze samenwerking schriftelijk vastleggen in deze resellerovereenkomst (de Overeenkomst).

## 1. Definities

1.1. **Klant:** een werkgever die door Reseller is aangebracht en die binnen de looptijd van deze Overeenkomst een overeenkomst voor arbodienstverlening sluit met React2u.

1.2. **Klantovereenkomst:** de overeenkomst voor arbodienstverlening tussen React2u en een Klant.

1.3. **Aansluittarief:** het vaste tarief per werknemer per jaar dat de Klant aan React2u betaalt voor de aansluiting op de arbodienstverlening, in de tarievenlijst ook Verrichtingenbasis genoemd (op de datum van deze Overeenkomst € 38,50 per werknemer per jaar), exclusief btw. Niet onder het Aansluittarief vallen losse diensten en uurwerk van specialisten, zoals spreekuren, consulten, interventies, re-integratietrajecten en keuringen.

1.4. **Contractjaar:** een periode van twaalf maanden, te rekenen vanaf de ingangsdatum van de Klantovereenkomst.

1.5. **Aanmelding:** de schriftelijke melding van een potentiële Klant door Reseller aan React2u, conform artikel 2.

## 2. Vrije samenwerking en aanbrengen van Klanten

2.1. De samenwerking is vrijblijvend. Reseller bepaalt zelf of, wanneer en hoeveel potentiële Klanten hij aanbrengt. Er geldt geen minimum en geen targets.

2.2. De samenwerking is niet exclusief. Beide Partijen zijn vrij om ook met andere partijen samen te werken, ook op het gebied van arbodienstverlening.

2.3. Reseller brengt potentiële Klanten in contact met React2u voor arbodienstverlening.

2.4. Reseller meldt een potentiële Klant aan per e-mail via sales@react2u.nl, met de naam van de klant, het aantal werknemers en het vraagstuk, of laat de klant zich aanmelden via de persoonlijke partnercode of aanmeldlink van Reseller. Alleen zo aangemelde Klanten tellen mee voor de vergoeding.

2.5. React2u stuurt de potentiële Klant binnen twee werkdagen een offerte op basis van de geldende tarievenlijst. Reseller ontvangt een kopie en kan aansluiten bij het eerste gesprek.

2.6. Een potentiële Klant geldt als aangebracht door Reseller als React2u de Aanmelding heeft bevestigd en de Klantovereenkomst binnen zes maanden na die bevestiging tot stand komt.

2.7. React2u kan een Aanmelding binnen vijf werkdagen weigeren als de potentiële Klant al klant is van React2u, al in contact is met React2u of al door een andere partij is aangemeld. React2u laat dit Reseller dan schriftelijk weten.

2.8. React2u beslist zelfstandig of zij een Klantovereenkomst sluit en onder welke voorwaarden. Reseller kan geen tarieven, kortingen of toezeggingen namens React2u doen, tenzij React2u daarvoor vooraf schriftelijk toestemming geeft.

## 3. Vergoeding

3.1. Voor iedere Klant ontvangt Reseller een vergoeding op basis van het Aansluittarief dat React2u aan die Klant factureert:
a. eerste Contractjaar: 50% van het Aansluittarief;
b. ieder volgend Contractjaar: 25% van het Aansluittarief.

3.2. De vergoeding loopt door zolang de Klantovereenkomst van kracht is, ook na beëindiging van deze Overeenkomst, behalve in het geval genoemd in artikel 8 lid 3.

3.3. De vergoeding is alleen verschuldigd over Aansluittarieven die de Klant daadwerkelijk aan React2u heeft betaald. Over onbetaalde, gecrediteerde of terugbetaalde bedragen is geen vergoeding verschuldigd. Het incassorisico ligt bij React2u. Een al betaalde vergoeding over zulke bedragen mag React2u verrekenen met volgende vergoedingen.

3.4. Kiest een Klant voor Casemanagement Compleet of een Reflex flextarief, dan spreken Partijen de vergoeding voor die Klant vooraf af. Een bevestiging per e-mail volstaat.

3.5. Wijzigt het Aansluittarief, bijvoorbeeld door een tariefwijziging of een ander aantal medewerkers, dan wordt de vergoeding berekend over het gewijzigde Aansluittarief.

3.6. Alle bedragen in deze Overeenkomst zijn exclusief btw.

3.7. Naast deze vergoeding heeft Reseller geen recht op enige andere vergoeding, onkostenvergoeding of bonus, tenzij Partijen dat schriftelijk afspreken.

## 4. Facturatie en betaling

4.1. React2u sluit de Klantovereenkomst rechtstreeks met de Klant en factureert de Klant zelf. Reseller heeft geen contract met de Klant en is tegenover de Klant niet aansprakelijk voor de arbodienstverlening.

4.2. React2u stuurt Reseller na afloop van ieder kwartaal een specificatie per Klant met de betaalde Aansluittarieven en de daarover verschuldigde vergoeding.

4.3. Reseller factureert de vergoeding op basis van deze specificatie aan React2u. React2u betaalt de factuur binnen 30 dagen na ontvangst.

4.4. Reseller kan binnen 30 dagen na ontvangst van een specificatie schriftelijk bezwaar maken. Daarna geldt de specificatie als juist.

## 5. Uitgangspunten voor Reseller

5.1. Reseller presenteert de diensten van React2u juist en volledig.

5.2. Reseller handelt als zelfstandig ondernemer. Er is geen sprake van een arbeidsovereenkomst, agentuurovereenkomst of vertegenwoordiging. Reseller is niet bevoegd om React2u te binden.

5.3. Reseller is zelf verantwoordelijk voor de afdracht van belastingen en premies over de ontvangen vergoeding.

## 6. Uitgangspunten voor React2u

6.1. React2u voert de arbodienstverlening voor Klanten zelfstandig uit, onder haar eigen voorwaarden en certificering.

6.2. De klantrelatie blijft bij Reseller. React2u neemt alleen de arbodienstverlening over en biedt Klanten andere diensten, zoals salarisadministratie of HR-advies, alleen aan met toestemming van Reseller.

6.3. React2u verstrekt Reseller op verzoek informatie over haar diensten en tarieven en informeert Reseller over de status van een Aanmelding.

## 7. Naam, merk en privacy

7.1. Reseller mag de naam en het logo van React2u gebruiken om de diensten van React2u onder de aandacht te brengen. Na beëindiging van deze Overeenkomst stopt dit gebruiksrecht.

7.2. Reseller deelt met React2u alleen de zakelijke contactgegevens die nodig zijn voor de Aanmelding. Reseller deelt geen gezondheids- of verzuimgegevens van medewerkers van (potentiële) Klanten.

7.3. Partijen houden zich ieder zelfstandig aan de Algemene verordening gegevensbescherming (AVG).

## 8. Duur en beëindiging

8.1. Deze Overeenkomst gaat in op de datum van ondertekening en geldt voor onbepaalde tijd.

8.2. Iedere Partij kan deze Overeenkomst op ieder moment per e-mail opzeggen met een opzegtermijn van één maand.

8.3. Na beëindiging behoudt Reseller het recht op de vergoeding over Klanten die vóór de einddatum zijn aangebracht, zolang hun Klantovereenkomst loopt, tenzij Reseller deze Klanten actief beweegt om over te stappen naar een andere arbodienst.

## 9. Geheimhouding

9.1. Partijen houden vertrouwelijke informatie van de andere Partij geheim, zoals tarieven en klantgegevens. Dit geldt ook na beëindiging van deze Overeenkomst.

## 10. Aansprakelijkheid

10.1. React2u is tegenover Reseller niet aansprakelijk voor de uitvoering van de arbodienstverlening aan Klanten. Klachten van Klanten over de dienstverlening handelt React2u zelf af.

10.2. Partijen zijn niet aansprakelijk voor elkaars indirecte schade, waaronder gederfde winst, behalve bij opzet of bewuste roekeloosheid.

## 11. Slotbepalingen

11.1. Wijzigingen van deze Overeenkomst zijn alleen geldig als Partijen ze schriftelijk overeenkomen.

11.2. Mededelingen op grond van deze Overeenkomst, zoals Aanmeldingen, specificaties en opzeggingen, gaan per e-mail naar de e-mailadressen die bij Partijen zijn vermeld. Een Partij geeft een wijziging van haar e-mailadres schriftelijk door.

11.3. Deze Overeenkomst vervangt alle eerdere afspraken tussen Partijen over het aanbrengen van klanten.

11.4. Reseller kan de rechten en plichten uit deze Overeenkomst niet overdragen zonder voorafgaande schriftelijke toestemming van React2u.

11.5. Op deze Overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank Oost-Brabant.`;

/** De zin boven de handtekeningen van de resellerovereenkomst, zoals in het Word-bestand. */
export const RESELLER_SLOT = "Aldus overeengekomen en in tweevoud ondertekend.";

/* ---------- de vergoeding in artikel 3.1 ---------- */

const VERGOEDING = /eerste Contractjaar: (\d{1,3}(?:,\d{1,2})?)% van het Aansluittarief;\s*b\. ieder volgend Contractjaar: (\d{1,3}(?:,\d{1,2})?)% van het Aansluittarief\./;

/** 37.5 → "37,5"; 50 → "50". */
export const procent = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/** De percentages uit artikel 3.1 ("50" en "25"), of null als die zin niet (meer) in de tekst staat. */
export function resellerVergoeding(tekst: string | null | undefined): { jaarEen: string; vervolg: string } | null {
  const m = (tekst || "").match(VERGOEDING);
  return m ? { jaarEen: m[1], vervolg: m[2] } : null;
}

type Pct = { jaarEen: number | string; vervolg: number | string };

/** Een tekst met andere percentages in artikel 3.1; zonder die zin (weggehaald) blijft hij zoals hij is. */
export function metVergoeding(tekst: string, pct: Pct): string {
  const v = (x: number | string) => (typeof x === "number" ? procent(x) : x);
  return tekst.replace(
    VERGOEDING,
    () => `eerste Contractjaar: ${v(pct.jaarEen)}% van het Aansluittarief;\nb. ieder volgend Contractjaar: ${v(pct.vervolg)}% van het Aansluittarief.`,
  );
}

/** De standaardtekst met de percentages van één partner in artikel 3.1. */
export function resellerTekst(pct?: Pct | null): string {
  return pct ? metVergoeding(RESELLER_STANDAARD, pct) : RESELLER_STANDAARD;
}

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

export type ContractSoort = "basiscontract" | "reseller";

/** De standaardtekst van een soort contract. */
export function standaardTekst(soort: ContractSoort = "basiscontract"): string {
  return soort === "reseller" ? RESELLER_STANDAARD : CONTRACT_STANDAARD;
}

/** De versie van de standaardtekst van een soort contract. */
export function standaardVersie(soort: ContractSoort = "basiscontract"): string {
  return soort === "reseller" ? RESELLER_VERSIE : CONTRACT_VERSIE;
}

/**
 * Of de tekst van een contract afwijkt van de standaard (witruimte telt niet
 * mee). Bij een resellerovereenkomst tellen de percentages in 3.1 niet als
 * afwijking: die horen bij de partner.
 */
export function wijktAf(tekst: string | null | undefined, soort: ContractSoort = "basiscontract"): boolean {
  const schoon = (t: string) => t.replace(/\s+/g, " ").trim();
  const standaard = soort === "reseller" ? resellerTekst(resellerVergoeding(tekst)) : CONTRACT_STANDAARD;
  return schoon(tekst || "") !== schoon(standaard);
}

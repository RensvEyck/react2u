# DNS omzetten: WordPress → Vercel

Runbook voor het moment dat `react2u.nl` van de oude WordPress-site naar de
Next.js-site op Vercel gaat. Nameservers staan bij **Hostnet**; die blijven waar
ze zijn — we wijzigen alleen records. Het Hostnet-account wordt beheerd door
**Theiner ICT**: zij voeren de wijziging uit, niet wijzelf.

Gemeten op 4 augustus 2026. Controleer met de commando's onderaan of het beeld
nog klopt voor je iets wijzigt.

## Wat er verandert — twee records, meer niet

| Naam | Nu | Wordt |
|---|---|---|
| `react2u.nl` (apex) | `A 35.204.120.88` | `A 76.76.21.21` |
| `www` | `A 35.204.120.88` | `CNAME cname.vercel-dns.com` |

Kan Hostnet geen CNAME op `www` naast andere records aan, gebruik dan ook daar
`A 76.76.21.21`. Beide domeinen zijn in Vercel al aan het project `react2u`
gekoppeld, dus er hoeft aan die kant niets te gebeuren. `www` stuurt door naar
het kale domein (308, pad en querystring blijven staan) — dat regelt
`next.config.ts`, niet de DNS.

## Wat je met rust laat

Deze records dragen de mail en de Microsoft 365-koppeling. Eén ervan weghalen
betekent dat mail stopt of geweigerd wordt — en bij `p=reject` merk je dat niet
aan bounces in je eigen inbox.

| Type | Naam | Waarde | Waarom |
|---|---|---|---|
| MX | `@` | `react2u-nl.mail.protection.outlook.com` (prio 0) | Alle inkomende mail |
| TXT | `@` | `v=spf1 a mx ip4:82.172.190.206 include:_spf_eucentral1.prod.hydra.sophos.com include:spf.protection.outlook.com -all` | Wie namens het domein mag versturen |
| TXT | `@` | `MS=ms23148887` | Domeinverificatie Microsoft 365 |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r;` | Weigert niet-uitgelijnde mail |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | Outlook-clients vinden de server |
| CNAME | `selector1._domainkey` | `selector1-react2u-nl._domainkey.react2u.onmicrosoft.com` | DKIM-ondertekening |

> **Let op de wildcard.** Er staat een `*.react2u.nl → 185.107.91.91` (Hostnet).
> Daardoor lijkt élk subdomein te bestaan: `mail`, `smtp`, `webmail`, `sip` en
> zelfs `willekeurige-onzin` geven allemaal dat adres terug. Dat zijn geen echte
> records. Ga niet "opruimen" op basis van wat `dig` teruggeeft — kijk in het
> Hostnet-paneel welke records daadwerkelijk zijn ingevoerd.

> **Kleine afwijking, geen blokkade.** Alleen `selector1._domainkey` bestaat;
> `selector2._domainkey` ontbreekt. Microsoft 365 verwacht normaal beide voor
> DKIM-sleutelrotatie. Los van deze omzetting het nakijken waard.

## Vooraf

1. **TTL is al laag.** De apex staat op 600 seconden, dus een wijziging is
   binnen ~10 minuten zichtbaar en een terugrol net zo snel. Extra verlagen is
   niet nodig.
2. **Controleer dat de nieuwe site staat.** Alle drie moeten `200` geven. Staat
   de onderhoudsmodus aan, dan krijg je `503` — dat is dan geen fout, maar
   bedenk wel of bezoekers van react2u.nl de onderhoudspagina mogen zien:
   ```
   curl -sI https://react2u.vercel.app | head -1
   curl -sI https://react2u.vercel.app/vacatures | head -1
   curl -sI https://react2u.vercel.app/diensten | head -1
   ```
3. **Kies een rustig moment.** Tijdens de omzetting zien bezoekers afhankelijk
   van hun resolver even de oude of de nieuwe site.

## De omzetting

1. Laat Theiner ICT de twee records uit de eerste tabel wijzigen in het
   Hostnet-paneel. Stuur de tabel *Wat je met rust laat* mee.
2. Wacht tot de wijziging doorwerkt (~10 min).
3. Vercel geeft automatisch een Let's Encrypt-certificaat uit zodra het domein
   naar hun edge wijst. Tot dat klaar is kan HTTPS kortstondig een
   certificaatwaarschuwing geven — dat lost zichzelf op, meestal binnen enkele
   minuten.

## Verifiëren

```
dig +short react2u.nl A          # verwacht 76.76.21.21
dig +short www.react2u.nl        # verwacht cname.vercel-dns.com of 76.76.21.x
curl -sI https://react2u.nl | grep -i "server\|x-vercel"
```

De oude site verraadt zich met `x-powered-by: WP.one`; zie je die kop nog, dan
wijst je resolver nog naar WordPress.

Mail apart controleren — dit moet ná de omzetting ongewijzigd zijn:

```
dig +short react2u.nl MX         # verwacht react2u-nl.mail.protection.outlook.com
dig +short react2u.nl TXT        # SPF én MS=ms23148887 moeten er nog staan
dig +short _dmarc.react2u.nl TXT
```

Stuur voor de zekerheid een testmail naar een `@react2u.nl`-adres én vanaf een
`@react2u.nl`-adres naar een externe mailbox.

> **De SPF begint met `a`.** Dat betekent: het IP van het A-record mag mail
> versturen namens react2u.nl. Na de omzetting is dat het Vercel-adres in
> plaats van de WordPress-server. Vercel verstuurt geen mail vanaf dat adres,
> dus er gaat niets stuk — maar stuurde de WordPress-server zelf mail (een
> contactformulier bijvoorbeeld), dan is die nu niet meer gemachtigd. Dat is
> precies de bedoeling. De `a` mag er later uit.

## Terugrollen

Zet de twee records terug op `A 35.204.120.88`. Binnen ~10 minuten staat de
WordPress-site er weer. Laat de oude hosting daarom nog een tijd staan.

## Daarna

- Pas als de nieuwe site een paar dagen goed draait: WordPress-hosting opzeggen.
- De oude URL's zijn al afgevangen: `next.config.ts` bevat ruim dertig
  permanente redirects, samengesteld uit `wp-sitemap.xml` van de WordPress-site
  toen die nog live was. Daarin zitten de hele `/werkgever/`- en
  `/werknemer/`-structuur, `/adviseurs/`, de themarestanten (`/team/`,
  `/category/`, `/author/`, acht Engelstalige demo-artikelen) en de
  `/wp-content/`-verzoeken die crawlers nog jaren blijven doen. Trailing
  slashes handelt Next zelf af.
- **Kom je na de omzetting alsnog een 404 tegen in Search Console**, voeg het
  pad dan toe aan die lijst. De bron — de oude sitemap — is dan niet meer
  bereikbaar, dus dat gaat op signaal in plaats van vooraf.
- `NEXT_PUBLIC_SITE_URL` hoeft niet: sitemap, robots, canonicals en de link in
  de notificatiemail vallen al terug op `https://react2u.nl`. Zet hem alleen als
  je preview-deploys naar zichzelf wilt laten verwijzen in plaats van naar
  productie.

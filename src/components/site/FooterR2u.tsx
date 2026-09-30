"use client";
import Link from "next/link";
import type { ContactInfo } from "@/lib/content";
import type { Doelgroep, FooterDoc } from "@/lib/nav";
import Logo from "./Logo";
import { Pijl } from "./HeaderR2u";
import { jakarta, K, useVariant, telefoon, SITE, type Link2, type Variant } from "./r2uStijl";

/*
 * Footer uit het nieuwe ontwerp (D-Home, D-Werkgevers, D-Werknemers). Alleen op
 * staging. Welke variant: dezelfde als de header (zie useVariant).
 */

type Kolom = { kop: string; links: Link2[]; adres?: boolean };

const SLOGAN: Record<Variant, [string, string]> = {
  neutraal: ["Jouw mensen,", "onze aandacht."],
  werkgever: ["Grip op verzuim,", "aandacht voor je mensen."],
  werknemer: ["Ziek of vastgelopen?", "We helpen je verder."],
};

function kolommen(v: Variant, tel: string, contact: ContactInfo): Kolom[] {
  const bel = { label: tel, href: `tel:${contact.phone}` };
  const mail = { label: contact.email, href: `mailto:${contact.email}` };
  if (v === "werkgever") {
    return [
      {
        kop: "Diensten",
        links: [
          { label: "Verzuim WVP", href: "/verzuimbegeleiding-wvp" },
          { label: "Verzuim ERD/ZW", href: "/verzuimbegeleiding-erd-zw" },
          { label: "RI&E", href: "/risicomanagement" },
          { label: "Preventie", href: "/preventie-en-vitaliteit" },
          { label: "Coaching", href: "/begeleiding-en-coaching" },
          { label: "Trainingen", href: "/trainingen-en-workshops" },
        ],
      },
      {
        kop: "Voor werkgevers",
        links: [
          { label: "Werkwijze", href: "/werkgevers#werkwijze" },
          { label: "Zo start je", href: "/werkgevers#starten" },
          { label: "Tarieven", href: "/werkgevers#tarieven" },
          { label: "Vragen", href: "/werkgevers#vragen" },
          { label: "Offerte aanvragen", href: "/werkgevers#offerte" },
        ],
      },
      {
        kop: "Contact",
        adres: true,
        links: [bel, mail, { label: "Medewerker ziek melden", href: "/werkgevers#werkwijze" }, { label: "Over React2u", href: "/over-react2u" }],
      },
    ];
  }
  if (v === "werknemer") {
    return [
      {
        kop: "Als je ziek bent",
        links: [
          { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
          { label: "Verzuimperiode", href: "/werknemers#tijdlijn" },
          { label: "Je rechten", href: "/werknemers#rechten" },
          { label: "Privacy", href: "/werknemers#privacy" },
        ],
      },
      {
        kop: "Begeleiding",
        links: [
          { label: "Je casemanager", href: "/werknemers#casemanager" },
          { label: "Coaching", href: "/werknemers#coaching" },
          { label: "Vragen", href: "/werknemers#vragen" },
        ],
      },
      {
        kop: "Contact",
        adres: true,
        links: [bel, mail, { label: "Ziek melden", href: "/werknemers#ziekmelden" }, { label: "Over React2u", href: "/over-react2u" }],
      },
    ];
  }
  return [
    {
      kop: "Voor werkgevers",
      links: [
        { label: "Diensten", href: "/werkgevers#diensten" },
        { label: "Werkwijze", href: "/werkgevers#werkwijze" },
        { label: "Tarieven", href: "/werkgevers#tarieven" },
        { label: "Offerte aanvragen", href: "/werkgevers#offerte" },
      ],
    },
    {
      kop: "Voor werknemers",
      links: [
        { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
        { label: "Je rechten", href: "/werknemers#rechten" },
        { label: "Casemanager", href: "/werknemers#casemanager" },
        { label: "Ziek melden", href: "/werknemers#ziekmelden" },
      ],
    },
    {
      kop: "React2u",
      links: [
        { label: "Over ons", href: "/over-react2u" },
        { label: "Blog", href: "/blog" },
        { label: "Werken bij", href: "/vacatures" },
      ],
    },
    { kop: "Contact", links: [bel, mail] },
  ];
}

/** De korte regel links onderaan op mobiel, zoals in de mobiele ontwerpen. */
const MOBIEL: Record<Variant, Link2[]> = {
  neutraal: [
    { label: "Voor werkgevers", href: "/werkgevers" },
    { label: "Voor werknemers", href: "/werknemers" },
    { label: "Ziek melden", href: "/werknemers#ziekmelden" },
    { label: "Over ons", href: "/over-react2u" },
    { label: "Blog", href: "/blog" },
  ],
  werkgever: [
    { label: "Diensten", href: "/werkgevers#diensten" },
    { label: "Werkwijze", href: "/werkgevers#werkwijze" },
    { label: "ERD en Ziektewet", href: "/werkgevers#erd" },
    { label: "Tarieven", href: "/werkgevers#tarieven" },
    { label: "Vragen", href: "/werkgevers#vragen" },
    { label: "Offerte", href: "/werkgevers#offerte" },
  ],
  werknemer: [
    { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
    { label: "Verzuimperiode", href: "/werknemers#tijdlijn" },
    { label: "Je rechten", href: "/werknemers#rechten" },
    { label: "Privacy", href: "/werknemers#privacy" },
    { label: "Casemanager", href: "/werknemers#casemanager" },
    { label: "Ziek melden", href: "/werknemers#ziekmelden" },
  ],
};

/**
 * De documenten uit de instellingen, met de namen uit het ontwerp en in die
 * volgorde. Een document dat we niet herkennen houdt zijn eigen naam.
 */
function documenten(docs: FooterDoc[]) {
  const soorten = [
    { test: /privacy/i, lang: "Privacyverklaring", kort: "Privacy" },
    { test: /voorwaarden/i, lang: "Algemene voorwaarden", kort: "Voorwaarden" },
    { test: /klacht/i, lang: "Klachtenregeling", kort: "Klachtenregeling" },
  ];
  const rang = (d: FooterDoc) => {
    const i = soorten.findIndex((s) => s.test.test(d.label));
    return i < 0 ? soorten.length : i;
  };
  return [...docs].sort((a, b) => rang(a) - rang(b)).map((d) => {
    const s = soorten.find((x) => x.test.test(d.label));
    return { href: d.href, lang: s?.lang ?? d.label, kort: s?.kort ?? d.label };
  });
}

function Go({ href, className, style, children }: {
  href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  if (href.startsWith("tel:") || href.startsWith("mailto:")) {
    return <a href={href} className={className} style={style}>{children}</a>;
  }
  return <Link href={href} className={className} style={style}>{children}</Link>;
}

/** De pill naar de andere doelgroep: rond op desktop, een brede kaart op mobiel. */
function NaarAnder({ ander }: { ander: Doelgroep }) {
  const kleur = ander === "werknemer" ? K.magenta : K.indigo;
  const bg = ander === "werknemer" ? K.roze : K.zacht;
  return (
    <>
      <Link href={SITE[ander].href}
        className="rk-row flex items-center justify-between gap-4 rounded-[24px] py-3.5 pl-[18px] pr-3.5 lg:hidden"
        style={{ background: bg }}>
        <span className="flex flex-col gap-1">
          <span className="text-[13px] font-bold" style={{ color: K.tekst2 }}>Ben je {ander}?</span>
          <span className="text-[17px] font-extrabold tracking-[-0.4px]" style={{ color: kleur }}>Naar React2u voor {SITE[ander].naam}</span>
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: kleur }}><Pijl /></span>
      </Link>
      <Link href={SITE[ander].href}
        className="rk-row mt-2 hidden items-center gap-3 self-start rounded-full py-2 pl-5 pr-2 text-[15px] font-bold lg:flex"
        style={{ background: bg, color: kleur }}>
        <span className="whitespace-nowrap">
          <span className="font-semibold" style={{ color: K.tekst2 }}>Ben je {ander}?</span> Naar de {SITE[ander].naam}site
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: kleur }}><Pijl /></span>
      </Link>
    </>
  );
}

export default function FooterR2u({ contact, docs }: { contact: ContactInfo; docs: FooterDoc[] }) {
  const variant = useVariant();
  const tel = telefoon(contact);
  const cols = kolommen(variant, tel, contact);
  const docLinks = documenten(docs);
  const ander: Doelgroep | null = variant === "werkgever" ? "werknemer" : variant === "werknemer" ? "werkgever" : null;
  const [s1, s2] = SLOGAN[variant];
  const ruimte = {
    neutraal: "lg:pb-12 lg:pt-[88px]",
    werkgever: "lg:pb-10 lg:pt-[72px]",
    werknemer: "lg:pb-8 lg:pt-16",
  }[variant];

  return (
    <footer className={`rk ${jakarta.className}`} style={{ background: K.ivoor, color: K.indigo }}>
      <div className={`mx-auto flex max-w-[1440px] flex-col gap-[22px] px-5 pb-7 pt-11 text-[15px] md:px-10 lg:gap-14 lg:px-20 ${ruimte}`}>
        {/* Mobiel: de pill naar de andere site staat bovenaan. */}
        {ander && <div className="lg:hidden"><NaarAnder ander={ander} /></div>}

        <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0">
          <div className="flex flex-col gap-[22px] lg:col-span-4 lg:gap-4">
            <Link href="/" aria-label="React2u, naar de homepage" className="self-start">
              <Logo title="" className="h-[44px] w-auto lg:h-[54px]" />
            </Link>
            <p className="text-[20px] font-extrabold leading-[1.15] tracking-[-0.5px] lg:text-[22px] lg:tracking-[-0.6px]">
              {s1}<br /><span style={{ color: K.magenta }}>{s2}</span>
            </p>
            {/* Adres: op mobiel altijd hier; op desktop hier alleen bij de neutrale footer. */}
            <p className={`leading-[1.6] ${ander ? "lg:hidden" : ""}`} style={{ color: K.tekst2 }}>
              {contact.addressLine1}<span className="lg:hidden">, </span><br className="hidden lg:block" />{contact.addressLine2}
            </p>
            {ander && <div className="hidden lg:flex lg:flex-col"><NaarAnder ander={ander} /></div>}
          </div>

          {/* Desktop: kolommen. */}
          {cols.map((c, i) => (
            <nav key={c.kop} aria-label={c.kop}
              className={`hidden flex-col gap-3 lg:flex ${
                i === 0 ? (ander ? "lg:col-span-2 lg:col-start-6" : "lg:col-span-2 lg:col-start-5") : i === cols.length - 1 && ander ? "lg:col-span-3" : "lg:col-span-2"}`}>
              <h2 className="text-[15px] font-extrabold" style={{ color: K.indigo }}>{c.kop}</h2>
              <ul className="flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Go href={l.href} className="rk-flink" style={{ color: K.tekst2 }}>{l.label}</Go>
                  </li>
                ))}
              </ul>
              {c.adres && (
                <p className="mt-1 leading-[1.6]" style={{ color: K.tekst2 }}>
                  {contact.addressLine1}<br />{contact.addressLine2}
                </p>
              )}
            </nav>
          ))}

          {/* Mobiel: één rij links. */}
          <nav aria-label="Footer" className="lg:hidden">
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5 font-bold">
              {MOBIEL[variant].map((l) => (
                <li key={l.href}><Link href={l.href} className="rk-link">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t-[1.5px] pt-5 text-[12px] leading-[1.6] lg:flex-row lg:justify-between lg:gap-6 lg:pt-7 lg:text-[13px]"
          style={{ borderColor: K.lijn, color: K.klein }}>
          <p>
            © React2u II B.V. · KvK {contact.kvk} · ISO 9001<span className="hidden lg:inline"> gecertificeerd</span>
          </p>
          <ul className="flex flex-wrap items-center lg:gap-6">
            {docLinks.map((d, i) => (
              <li key={`${d.href}-${i}`} className="flex items-center">
                {i > 0 && <span aria-hidden className="px-1 lg:hidden">·</span>}
                <a href={d.href} target="_blank" rel="noopener" className="rk-flink" style={{ color: K.klein }}>
                  <span className="lg:hidden">{d.kort}</span><span className="hidden lg:inline">{d.lang}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

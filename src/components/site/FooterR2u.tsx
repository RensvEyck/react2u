"use client";
import Link from "next/link";
import type { ContactInfo } from "@/lib/content";
import type { Certificate, FooterDoc } from "@/lib/nav";
import { DOCUMENTEN } from "@/lib/documenten";
import Logo from "./Logo";
import { letter, K, telefoon, type Link2 } from "./r2uStijl";
import { CookieSettingsLink } from "./CookieBanner";
import { useTaal } from "./Taal";
import { pad, vul, type Taal } from "@/lib/taal";
import type { Woordenboek } from "@/lib/woordenboek";

/* eslint-disable @next/next/no-img-element */

/*
 * Footer uit het ontwerp (Design-canvas): een witte kaart op ivoor met het
 * logo en vier kolommen, daaronder de keurmerken als witte tegels en een
 * regel met KvK en de juridische documenten. Op staging en op de Engelse site;
 * de teksten komen uit het woordenboek, de adressen uit de koppeltabel.
 */

/**
 * De keurmerken in de footer zijn altijd de logo's uit het ontwerp. In de
 * instellingen staan de certificaten als PDF; die worden de doorklik achter
 * het bijbehorende logo (herkend aan de naam).
 */
const KEURMERKEN: (Certificate & { zoek?: RegExp })[] = [
  { image: "/beeld/keurmerken/sbca.jpg", alt: "SBCA gecertificeerde arbodienst", href: "", zoek: /arbodienst|sbca|managementsysteem/i },
  { image: "/beeld/keurmerken/iso9001.png", alt: "DNV ISO 9001 certificaat", href: "", zoek: /9001/i },
  { image: "/beeld/keurmerken/iso27001.png", alt: "DNV ISO 27001 certificaat", href: "", zoek: /27001/i },
  { image: "/beeld/keurmerken/iso27701.png", alt: "DNV ISO 27701 certificaat", href: "", zoek: /27701/i },
  { image: "/beeld/keurmerken/oval.png", alt: "Lid van OVAL", href: "", zoek: /oval/i },
];

function keurmerkenMetLinks(certificates: Certificate[], alts: string[]): Certificate[] {
  return KEURMERKEN.map(({ zoek, ...k }, i) => {
    const c = zoek && certificates.find((x) => zoek.test(`${x.alt} ${x.href} ${x.image}`));
    return { ...k, alt: alts[i] || k.alt, href: c ? c.href || c.image : "" };
  });
}

type Kolom = { kop: string; regels: (Link2 & { sterk?: boolean })[] };

function kolommen(contact: ContactInfo, taal: Taal, t: Woordenboek): Kolom[] {
  const f = t.footer;
  const link = (l: { label: string; slug: string; anker?: string }) => ({ label: l.label, href: pad(taal, l.slug, l.anker) });
  return [
    {
      kop: f.bezoekadres,
      regels: [
        { label: "React2u", href: "" },
        { label: contact.addressLine1, href: "" },
        { label: contact.addressLine2, href: "" },
      ],
    },
    {
      kop: f.contact,
      regels: [
        { label: telefoon(contact, taal), href: `tel:${contact.phone}`, sterk: true },
        { label: t.algemeen.openingstijden, href: "" },
        { label: contact.email, href: `mailto:${contact.email}`, sterk: true },
        { label: f.alleContactgegevens, href: pad(taal, "contact") },
      ],
    },
    { kop: f.voorWerkgevers, regels: f.werkgeverLinks.map(link) },
    { kop: f.voorWerknemers, regels: f.werknemerLinks.map(link) },
  ];
}

/**
 * De vier definitieve juridische documenten (versie oktober 2026, zie
 * lib/documenten.ts) staan altijd in de footer. Wat de instellingen daarnaast
 * nog hebben, komt erachter; oude versies van dezelfde documenten en het oude
 * privacyreglement (de WordPress-PDF) vallen weg. De PDF's bestaan alleen in
 * het Nederlands; op de Engelse site staat er "(Dutch)" achter.
 */
function documenten(docs: FooterDoc[], t: Woordenboek) {
  const nl = t.algemeen.alleenNederlands;
  const vast = [
    { naam: `${t.footer.documenten.privacy}${nl}`, href: DOCUMENTEN.privacyverklaring },
    { naam: `${t.footer.documenten.voorwaarden}${nl}`, href: DOCUMENTEN.algemeneVoorwaarden },
    { naam: `${t.footer.documenten.klachten}${nl}`, href: DOCUMENTEN.klachtenregeling },
    { naam: `${t.footer.documenten.cookies}${nl}`, href: DOCUMENTEN.cookieverklaring },
  ];
  const vervangen = /privacy|cookie|voorwaarden|klacht|reglement/i;
  const overig = docs.filter((d) => !vervangen.test(d.label)).map((d) => ({ href: d.href, naam: `${d.label}${nl}` }));
  return [...vast, ...overig];
}

function Regel({ r }: { r: Link2 & { sterk?: boolean } }) {
  const style = { color: r.sterk ? K.indigo : K.tekst2, fontWeight: r.sterk ? 700 : 400 };
  if (!r.href) return <span style={style}>{r.label}</span>;
  if (r.href.startsWith("/")) return <Link href={r.href} className="rk-flink" style={style}>{r.label}</Link>;
  return <a href={r.href} className="rk-flink" style={style}>{r.label}</a>;
}

export default function FooterR2u({ contact, docs, certificates }: {
  contact: ContactInfo; docs: FooterDoc[]; certificates: Certificate[];
}) {
  const { taal, t } = useTaal();
  const docLinks = documenten(docs, t);
  const keurmerken = keurmerkenMetLinks(certificates, t.footer.keurmerkAlts);
  const jaar = new Date().getFullYear();
  return (
    <footer className={`rk ${letter.className}`} style={{ background: K.ivoor }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pb-10 pt-16 md:px-10 md:pt-24 xl:px-[120px]">
        <div className="flex flex-col gap-9 rounded-[20px] bg-white px-6 pb-9 pt-8 md:px-10 md:pb-11 md:pt-10">
          <Link href={taal === "en" ? "/en" : "/"} aria-label={t.footer.logoNaarHome} className="self-start">
            <Logo title="" className="h-[48px] w-auto md:h-[56px]" />
          </Link>
          {/* Tot 1024px twee kolommen: in vier werd elke kolom op een tablet zo
              smal dat "Alle contactgegevens" en "Je rechten en privacy" braken. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4 lg:gap-x-8">
            {kolommen(contact, taal, t).map((k) => (
              <div key={k.kop} className="flex flex-col gap-[18px]">
                <span className="text-[15px] font-bold" style={{ color: K.indigo }}>{k.kop}</span>
                <div className="flex flex-col gap-2 text-[15px] leading-[1.5]">
                  {k.regels.map((r, i) => <Regel key={i} r={r} />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {keurmerken.length > 0 && (
          <ul aria-label={t.footer.keurmerken} className="flex flex-wrap gap-2 md:gap-4">
            {keurmerken.map((c, i) => {
              const tegel = c.image ? (
                <img src={c.image} alt={c.alt} loading="lazy" className="h-[50px] w-[50px] object-contain md:h-[76px] md:w-[76px]" />
              ) : (
                <span className="px-1 text-center text-[11px] font-bold leading-tight" style={{ color: K.indigo }}>{c.alt}</span>
              );
              const cls = "grid h-[60px] w-[60px] place-items-center rounded-[12px] bg-white p-1.5 md:h-[92px] md:w-[92px] md:rounded-[16px] md:p-2";
              return (
                <li key={i}>
                  {c.href
                    ? <a href={c.href} target="_blank" rel="noopener noreferrer" className={`${cls} lift`} aria-label={c.alt || undefined}>{tegel}</a>
                    : <span className={cls}>{tegel}</span>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-3 pt-2 text-[13px] md:flex-row md:flex-wrap md:items-center md:gap-8 md:pt-6" style={{ color: K.klein }}>
          <span>{vul(t.footer.rechten, { jaar, kvk: contact.kvk })}</span>
          {docLinks.length > 0 && (
            <span className="flex flex-wrap gap-x-8 gap-y-2">
              {docLinks.map((d) => (
                <a key={d.href + d.naam} href={d.href} target={/\.pdf($|\?)/i.test(d.href) ? "_blank" : undefined} rel="noopener" className="rk-flink font-semibold" style={{ color: K.indigo }}>{d.naam}</a>
              ))}
              <CookieSettingsLink className="rk-flink font-semibold" style={{ color: K.indigo }} />
              {t.footer.sitemap && <Link href="/sitemap" className="rk-flink font-semibold" style={{ color: K.indigo }}>{t.footer.sitemap}</Link>}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

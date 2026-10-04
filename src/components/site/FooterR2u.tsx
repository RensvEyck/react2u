"use client";
import Link from "next/link";
import type { ContactInfo } from "@/lib/content";
import type { Certificate, FooterDoc } from "@/lib/nav";
import Logo from "./Logo";
import { letter, K, telefoon, type Link2 } from "./r2uStijl";

/* eslint-disable @next/next/no-img-element */

/*
 * Footer uit het ontwerp (Design-canvas): een witte kaart op ivoor met het
 * logo en vier kolommen, daaronder de keurmerken als witte tegels en een
 * regel met KvK en de juridische documenten. Alleen op staging.
 */

/** Keurmerken uit het ontwerp, zolang er in de instellingen nog niets staat. */
const KEURMERKEN: Certificate[] = [
  { image: "/beeld/keurmerken/sbca.jpg", alt: "SBCA gecertificeerde arbodienst", href: "" },
  { image: "/beeld/keurmerken/iso9001.png", alt: "DNV ISO 9001 certificaat", href: "" },
  { image: "/beeld/keurmerken/iso27001.png", alt: "DNV ISO 27001 certificaat", href: "" },
  { image: "/beeld/keurmerken/iso27701.png", alt: "DNV ISO 27701 certificaat", href: "" },
  { image: "/beeld/keurmerken/oval.png", alt: "Lid van OVAL", href: "" },
];

type Kolom = { kop: string; regels: (Link2 & { sterk?: boolean })[] };

function kolommen(contact: ContactInfo): Kolom[] {
  return [
    {
      kop: "Bezoekadres",
      regels: [
        { label: "React2u", href: "" },
        { label: contact.addressLine1, href: "" },
        { label: contact.addressLine2, href: "" },
      ],
    },
    {
      kop: "Contact",
      regels: [
        { label: telefoon(contact), href: `tel:${contact.phone}`, sterk: true },
        { label: contact.email, href: `mailto:${contact.email}`, sterk: true },
        { label: "Alle contactgegevens", href: "/contact" },
      ],
    },
    {
      kop: "Voor werkgevers",
      regels: [
        { label: "Diensten", href: "/werkgevers#diensten" },
        { label: "Tarieven", href: "/werkgevers#tarieven" },
        { label: "Kennismaken", href: "/werkgevers#offerte" },
      ],
    },
    {
      kop: "Voor werknemers",
      regels: [
        { label: "Ziek, wat nu?", href: "/werknemers#wat-nu" },
        { label: "Je rechten en privacy", href: "/werknemers#rechten" },
        { label: "Je casemanager", href: "/werknemers#casemanager" },
      ],
    },
  ];
}

/** De documenten uit de instellingen, met vaste namen en in vaste volgorde. */
function documenten(docs: FooterDoc[]) {
  const soorten = [
    { test: /privacy/i, naam: "Privacyverklaring" },
    { test: /voorwaarden/i, naam: "Algemene voorwaarden" },
    { test: /klacht/i, naam: "Klachtenregeling" },
  ];
  const rang = (d: FooterDoc) => {
    const i = soorten.findIndex((s) => s.test.test(d.label));
    return i < 0 ? soorten.length : i;
  };
  return [...docs].sort((a, b) => rang(a) - rang(b)).map((d) => ({
    href: d.href,
    naam: soorten.find((x) => x.test.test(d.label))?.naam ?? d.label,
  }));
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
  const docLinks = documenten(docs);
  const keurmerken = certificates.length > 0 ? certificates : KEURMERKEN;
  const jaar = new Date().getFullYear();
  return (
    <footer className={`rk ${letter.className}`} style={{ background: K.ivoor }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pb-10 pt-16 md:px-10 md:pt-24 xl:px-[120px]">
        <div className="flex flex-col gap-9 rounded-[20px] bg-white px-6 pb-9 pt-8 md:px-10 md:pb-11 md:pt-10">
          <Link href="/" aria-label="React2u, naar de homepage" className="self-start">
            <Logo title="" className="h-[48px] w-auto md:h-[56px]" />
          </Link>
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4 md:gap-x-8">
            {kolommen(contact).map((k) => (
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
          <ul aria-label="Certificeringen en keurmerken" className="flex flex-wrap gap-2 md:gap-4">
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
          <span>© {jaar} React2u II B.V. Alle rechten voorbehouden. · KvK {contact.kvk}</span>
          {docLinks.length > 0 && (
            <span className="flex flex-wrap gap-x-8 gap-y-2">
              {docLinks.map((d) => (
                <a key={d.href + d.naam} href={d.href} className="rk-flink font-semibold" style={{ color: K.indigo }}>{d.naam}</a>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

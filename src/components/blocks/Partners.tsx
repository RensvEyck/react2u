import { outfit } from "./HomeVerhaal";
import { NAVY, BODY, SOFT, LAV, kop, BREED, Eyebrow } from "./Gedeeld";
import { SectieKop } from "./Doelgroep";
import { telefoonInTaal, type Taal } from "@/lib/taal";
import type { TarievenSettings } from "@/lib/tarieven";
import PartnerRekenhulp from "./PartnerRekenhulp";
import PartnerFormulier from "./PartnerFormulier";

type Ctx = { lang?: Taal; tarieven?: TarievenSettings };

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * De twee eigen blokken van /partners, het partnerprogramma voor
 * accountants, salariskantoren en HR- en verzekeringsadviseurs. De rest van
 * de pagina bestaat uit de gewone blokken van de site (dgKop, klantenStrook,
 * dgFotoLijst, dgStarten, dgPrijzen, dgLabels, klantenAanHetWoord,
 * dgVragen); deze twee volgen hun vorm:
 * - ptRekenhulp: sectiekop zoals elders, met het rekenvoorbeeld als kaart;
 * - ptAanmelden: zoals het kennismaakblok, met het aanmeldformulier.
 */

function anker(d: any) {
  return d.anchor ? { id: d.anchor } : {};
}

/* ---------- Rekenvoorbeeld ---------- */

export function PtRekenhulp({ d, ctx }: { d: any; ctx?: Ctx }) {
  const jaar = ctx?.tarieven?.jaar ?? String(new Date().getFullYear());
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28`} style={{ background: d.bg || SOFT }}>
      <div className={`${BREED} flex flex-col gap-8 py-14 md:gap-10 md:py-[104px]`}>
        <SectieKop d={d} />
        <PartnerRekenhulp r={d.rekenhulp || {}} jaar={jaar} />
      </div>
    </section>
  );
}

/* ---------- Aanmelden ---------- */

/** "Bel {telefoon} of mail naar {email}." met beide als link. */
function Direct({ tekst, telefoon, email, taal }: { tekst: string; telefoon: string; email: string; taal: Taal }) {
  const link = "font-bold underline underline-offset-4";
  return (
    <>
      {tekst.split(/(\{telefoon\}|\{email\})/).map((deel, i) =>
        deel === "{telefoon}" ? <a key={i} href={`tel:+31${telefoon.replace(/\D/g, "").replace(/^0/, "")}`} className={link} style={{ color: NAVY }}>{telefoonInTaal(telefoon, taal)}</a>
        : deel === "{email}" ? <a key={i} href={`mailto:${email}`} className={link} style={{ color: NAVY }}>{email}</a>
        : deel
      )}
    </>
  );
}

export function PtAanmelden({ d, ctx }: { d: any; ctx?: Ctx }) {
  const ontvang: string[] = d.ontvang || [];
  return (
    <section aria-label={d.heading} {...anker(d)} className={`hv ${outfit.variable} scroll-mt-28 px-[6px] pb-14 pt-4 md:px-10 md:pb-24 md:pt-8 lg:px-16 xl:mx-auto xl:max-w-[1440px] xl:px-[120px]`}>
      <div className="relative grid gap-8 overflow-hidden rounded-[28px] px-5 py-9 md:gap-10 md:rounded-[36px] md:p-14 lg:grid-cols-12 lg:gap-6 lg:p-12 xl:p-[72px]" style={{ background: LAV }}>
        <span aria-hidden className="absolute right-[-120px] top-[-150px] h-[520px] w-[520px] rounded-full" style={{ background: NAVY, opacity: 0.07 }} />
        <div className="relative flex flex-col gap-6 lg:col-span-5">
          {d.eyebrow && <Eyebrow>{d.eyebrow}</Eyebrow>}
          <h2 className={`${kop} m-0 whitespace-pre-line text-[40px] leading-[1.04] tracking-[-1.2px] md:text-[48px] md:tracking-[-1.5px] xl:text-[52px]`} style={{ color: NAVY }}>{d.heading}</h2>
          {d.text && <p className="m-0 text-[17px] leading-[1.65] md:text-[18px]" style={{ color: BODY }}>{d.text}</p>}
          {ontvang.length > 0 && (
            <div className="flex flex-col gap-4 pt-2">
              {d.ontvangKop && <span className="text-[16px] font-bold" style={{ color: NAVY }}>{d.ontvangKop}</span>}
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {ontvang.map((o, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold" style={{ color: NAVY }}>{i + 1}</span>
                    <span className="pt-1.5 text-[16px] leading-[1.55]" style={{ color: BODY }}>{o}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {d.direct && (
            <p className="m-0 pt-2 text-[16px] leading-[1.6]" style={{ color: BODY }}>
              <Direct tekst={d.direct} telefoon={d.telefoon || "085 620 58 00"} email={d.email || "sales@react2u.nl"} taal={ctx?.lang ?? "nl"} />
            </p>
          )}
        </div>
        <div className="relative rounded-[24px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(50,46,131,0.35)] sm:p-6 md:p-10 lg:col-span-6 lg:col-start-7">
          <PartnerFormulier f={d.form || {}} />
        </div>
      </div>
    </section>
  );
}

import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "./supabase/server";
import { onboardingPdf } from "./onboardingPdf";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { documentInfo, naarXpertRijen, XPERT_KOLOMMEN, type DocumentSleutel, type Onboarding, type OnboardingPubliek, type Werknemer } from "./onboarding";
import { xlsx } from "./xlsx";

/*
 * De bestanden van een onboarding (0037), gedeeld door de klantlink
 * (/onboarding/<token>/...) en het voorbeeld in het beheer
 * (/admin/onboardingvoorbeeld/<id>/...): dezelfde pdf en hetzelfde Excelbestand,
 * alleen de toegang verschilt (het token, of het salesrecht).
 */

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const bestandsnaam = (s: string, max = 100) => s.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

/** Eén document als pdf; een ingevuld formulier komt ingevuld mee. `?download=1` geeft hem als bestand. */
export async function onboardingPdfAntwoord(o: OnboardingPubliek, document: DocumentSleutel, download: boolean): Promise<Response> {
  // Wat React2u zelf invult op het inrichtingsformulier (contractsoort, debiteurnummer) ziet alleen een collega:
  // met de publieke sleutel geeft deze query niets terug.
  let intern: { contractsoort: string | null; debiteurnummer: string | null } | undefined;
  if (document === "inrichting") {
    const sb = await supabaseServer();
    const { data: rij } = await sb.from("onboardings").select("contractsoort, debiteurnummer").eq("id", o.id).maybeSingle();
    intern = (rij as Pick<Onboarding, "contractsoort" | "debiteurnummer"> | null) ?? undefined;
  }
  const { contact } = await offerteHuisstijl();
  const pdf = await onboardingPdf({ document, bedrijf: o.bedrijf, nummer: o.nummer, contact, antwoord: o.antwoorden?.[document], intern });
  const naam = bestandsnaam(`React2u ${documentInfo(document).titel} ${o.bedrijf}`) || o.nummer;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${naam}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/**
 * Het werknemersbestand voor de klant (de 37 kolommen van de import van
 * XpertSuite), om in Excel in te vullen en weer te uploaden. Staan er al
 * medewerkers, dan staan die erin: downloaden, aanvullen in Excel, uploaden
 * (Rens, 16 nov 2026: "exel download, klant vult gegevens in, en kan exel ook
 * weer uploaden met de gegevens").
 */
export function leegWerknemersbestand(bedrijf: string, rijen: Werknemer[] = []): Response {
  const naam = bestandsnaam(`Werknemersbestand React2u ${bedrijf}`, 90) || "Werknemersbestand";
  return new NextResponse(new Uint8Array(xlsx([[...XPERT_KOLOMMEN], ...naarXpertRijen(rijen, null)])), {
    headers: { "Content-Type": XLSX, "Content-Disposition": `attachment; filename="${naam}.xlsx"`, "Cache-Control": "private, no-store" },
  });
}

/** Het ingevulde werknemersbestand voor de import in XpertSuite (alleen voor het beheer). */
export function werknemersbestand(o: Pick<Onboarding, "nummer" | "bedrijf" | "debiteurnummer" | "antwoorden">): Response | null {
  const rijen = ((o.antwoorden?.werknemers?.data as { rijen?: Werknemer[] } | undefined)?.rijen) || [];
  if (!rijen.length) return null;
  const naam = bestandsnaam(`Import XpertSuite ${o.bedrijf}`, 80) || o.nummer;
  return new NextResponse(new Uint8Array(xlsx([[...XPERT_KOLOMMEN], ...naarXpertRijen(rijen, o.debiteurnummer)])), {
    headers: { "Content-Type": XLSX, "Content-Disposition": `attachment; filename="${naam}.xlsx"`, "Cache-Control": "private, no-store" },
  });
}

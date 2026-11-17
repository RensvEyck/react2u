import "server-only";
import { NextResponse } from "next/server";
import { evaluatiePdf } from "./evaluatiePdf";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { DOCUMENT, type EvaluatiePubliek } from "./evaluatie";

/*
 * De pdf van een klantevaluatie (0043), gedeeld door de klantlink
 * (/evaluatie/<token>/pdf) en het voorbeeld in het beheer
 * (/admin/evaluatievoorbeeld/<id>/pdf): dezelfde pdf, alleen de toegang
 * verschilt (het token, of het salesrecht).
 */

const bestandsnaam = (s: string, max = 100) => s.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

export async function evaluatiePdfAntwoord(e: EvaluatiePubliek, download: boolean): Promise<Response> {
  const { contact } = await offerteHuisstijl();
  const pdf = await evaluatiePdf({ e, contact });
  const naam = bestandsnaam(`React2u ${DOCUMENT.titel} ${e.bedrijf}`) || e.nummer;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${naam}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

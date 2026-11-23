import { NextResponse } from "next/server";
import { checklistPoortwachterPdf } from "@/lib/checklistPdf";
import { offerteHuisstijl } from "@/lib/offerteHuisstijl";

export const revalidate = 3600;

/**
 * De checklist poortwachterdossier als pdf (lib/checklistPdf.tsx). Eén
 * document voor iedereen, dus een uur te cachen; `?download=1` geeft hem als
 * bestand. Het formulier op de pagina mailt dezelfde pdf.
 */
export async function GET(req: Request) {
  const { contact } = await offerteHuisstijl();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
  const pdf = await checklistPoortwachterPdf({ contact, site });
  const download = new URL(req.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="checklist-poortwachterdossier-react2u.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

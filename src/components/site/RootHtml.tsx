import { DM_Sans, Figtree } from "next/font/google";
import type { Taal } from "@/lib/taal";
import "@/app/globals.css";

// Via next/font in plaats van een <link> naar Google Fonts: dat laatste is
// render-blocking en kost een extra verbinding met een derde partij. Nu worden
// de fonts mee-gebundeld en zelf geserveerd, wat LCP en CLS scheelt — en dat
// telt mee in de Core Web Vitals waar Google op rankt.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

/**
 * <html> en <body> voor de drie root layouts: de Nederlandse site (app/(site)),
 * de Engelse site (app/en) en het adminpaneel (app/admin). Er zijn er drie
 * omdat alleen een root layout `lang` op <html> kan zetten, en /en Engels
 * moet zijn waar de rest Nederlands is. Zie docs/adr/0001-tweetalig-nl-en.md.
 */
export default function RootHtml({ taal, children }: { taal: Taal; children: React.ReactNode }) {
  return (
    <html lang={taal} className={`${dmSans.variable} ${figtree.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

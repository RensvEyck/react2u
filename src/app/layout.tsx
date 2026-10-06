import type { Metadata } from "next";
import { DM_Sans, Figtree } from "next/font/google";
import "./globals.css";

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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";

// Alleen wat voor élke route geldt. De omschrijving en de deelafbeelding zijn
// instelbaar en staan daarom in app/(site)/layout.tsx — die haalt toch al
// instellingen op, en zo blijft het adminpaneel vrij van die query.
// De favicon komt uit app/favicon.ico, icon.png en apple-icon.png (Next zet
// de <link>-tags zelf), niet meer uit de oude WordPress-map op Supabase.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "React2u", template: "%s • React2u" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${dmSans.variable} ${figtree.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

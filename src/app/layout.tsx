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
const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp`;
const SHARE_IMAGE = `${MEDIA}/2023/07/cropped-cropped-Logo_react2u.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "React2u", template: "%s • React2u" },
  description: "Jouw mensen, onze aandacht! React2u is een moderne arbodienst.",
  icons: {
    icon: `${MEDIA}/2023/05/cropped-favicon-react2u-32x32.png`,
  },
  // Zonder deze defaults tonen LinkedIn, WhatsApp en X een kale link zonder
  // titel of afbeelding. Pagina's die hun eigen openGraph zetten winnen.
  openGraph: {
    type: "website",
    siteName: "React2u",
    locale: "nl_NL",
    url: SITE,
    title: "React2u",
    description: "Jouw mensen, onze aandacht! React2u is een moderne arbodienst.",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "React2u",
    description: "Jouw mensen, onze aandacht! React2u is een moderne arbodienst.",
    images: [SHARE_IMAGE],
  },
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

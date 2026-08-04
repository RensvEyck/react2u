import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl"),
  title: { default: "React2u", template: "%s • React2u" },
  description: "Jouw mensen, onze aandacht! React2u is een moderne arbodienst.",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/wp/2023/05/cropped-favicon-react2u-32x32.png`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Figtree:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://react2u.nl";
  // Alleen react2u.nl hoort in Google. Een preview-deploy (*.vercel.app)
  // serveert dezelfde pagina's; die sluit zijn robots.txt helemaal af. Het
  // Vercel-adres van productie (react2u.vercel.app) draait deze zelfde build
  // en krijgt daarom in next.config.ts een X-Robots-Tag: noindex op hostnaam.
  const preview = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";
  if (preview) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import NotFound from "@/components/site/NotFound";
import VisitTracker from "@/components/site/VisitTracker";
import { LOGO_URL } from "@/lib/nav";

export const metadata: Metadata = { title: "Pagina niet gevonden" };

/**
 * Voor URL's die op geen enkele route passen, zoals /oud/pad/dieper. Die
 * vallen buiten (site)/layout.tsx en krijgen dus geen header of footer mee;
 * daarom hier een eigen, lichte kop. De VisitTracker staat er los bij, want
 * die zit normaal in de sitelayout — zonder hem zou deze 404 niet gemeld worden.
 */
export default function RootNotFound() {
  return (
    <>
      <header className="border-b border-black/5 bg-white">
        <div className="container-site py-4">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="React2u" width={144} height={89} className="h-[64px] w-auto" />
          </Link>
        </div>
      </header>
      <main>
        <NotFound />
      </main>
      <VisitTracker />
    </>
  );
}

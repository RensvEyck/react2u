import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isWeten } from "@/lib/onboardingWeten";
import { KlantOnderwerpWeergave } from "@/components/admin/weten/WetenPaginas";

export const dynamic = "force-dynamic";

/** Eén onderwerp zoals de klant het leest in zijn onboarding, voor collega's in Mijn React2u. */
export default async function WatDeKlantLeest({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isWeten(slug)) notFound();
  await requireAdmin();
  return <KlantOnderwerpWeergave slug={slug} />;
}

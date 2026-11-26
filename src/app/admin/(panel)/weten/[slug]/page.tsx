import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isPortaalWeten } from "@/lib/portaalWeten";
import { PortaalOnderwerpWeergave } from "@/components/admin/weten/WetenPaginas";

export const dynamic = "force-dynamic";

/** Eén onderwerp van Goed om te weten voor collega's. */
export default async function GoedOmTeWetenOnderwerp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPortaalWeten(slug)) notFound();
  await requireAdmin();
  return <PortaalOnderwerpWeergave slug={slug} />;
}

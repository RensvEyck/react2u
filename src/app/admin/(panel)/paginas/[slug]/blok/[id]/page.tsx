import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { updateBlockData } from "@/app/admin/actions";
import JsonForm from "@/components/admin/JsonForm";

export default async function BlockEditor({
  params, searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { slug, id } = await params;
  const { fout } = await searchParams;
  const { sb } = await requireAdmin();
  const { data: block } = await sb.from("blocks").select("*").eq("id", id).maybeSingle();
  if (!block) notFound();
  const action = updateBlockData.bind(null, id, slug);

  return (
    <div>
      <div className="mb-8">
        <Link href={`/admin/paginas/${slug}`} className="text-sm text-black/50 hover:text-[#e75387]">← Terug naar pagina</Link>
        <h1 className="text-3xl font-bold text-[#312e82]">{block.label || block.type}</h1>
      </div>
      {fout === "json" && (
        <div className="mb-6 rounded-xl bg-[#e51673]/10 border border-[#e51673]/30 px-4 py-3 text-[#e51673]">
          Opslaan mislukt — ongeldige invoer. Probeer het opnieuw.
        </div>
      )}
      <JsonForm initial={block.data} action={action} />
    </div>
  );
}

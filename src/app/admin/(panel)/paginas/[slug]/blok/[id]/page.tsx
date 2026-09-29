import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/admin";
import { updateBlockData } from "@/app/admin/actions";
import { BLOCK_TEMPLATES } from "@/lib/blockTemplates";
import BlockEditor, { type BlockVersion } from "@/components/admin/BlockEditor";
import { loadVersions } from "@/lib/revisionsDb";
import { actorName } from "@/lib/revisions";
import { changedBlockFields } from "@/lib/blockFields";
import { LuArrowLeft } from "react-icons/lu";

export default async function BlockEditorPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { sb, admin } = await requirePerm("paginas");
  const { data: block } = await sb.from("blocks").select("*").eq("id", id).maybeSingle();
  if (!block) notFound();
  const history = await loadVersions(sb, "blocks", id);
  // history is nieuwste eerst; de vorige versie staat dus één plek verder.
  const versions: BlockVersion[] = history.map((v, i) => ({
    id: v.id,
    at: v.created_at,
    who: actorName(v, admin.userId),
    changed: history[i + 1] ? changedBlockFields(history[i + 1].data.data, v.data.data) : [],
    current: v.current,
    data: v.data.data,
  }));
  const action = updateBlockData.bind(null, id, slug);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/paginas/${slug}`} className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
          <LuArrowLeft className="text-[12px]" /> Terug naar pagina
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">
          {block.label || BLOCK_TEMPLATES[block.type]?.label || block.type}
        </h1>
        <p className="text-[14px] text-black/50">Pas de velden aan — rechts zie je direct het resultaat. Opslaan kan ook met ⌘S.</p>
      </div>
      <BlockEditor type={block.type} initial={block.data} action={action} versions={versions} />
    </div>
  );
}

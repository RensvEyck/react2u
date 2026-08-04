import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { savePost } from "@/app/admin/actions";
import PostFields from "@/components/admin/PostFields";
import type { Post } from "@/lib/types";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Post;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/blog" className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
            <LuArrowLeft className="text-[12px]" /> Alle artikelen
          </Link>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">{p.title}</h1>
        </div>
        {p.status === "published" && (
          <a href={`/blog/${p.slug}`} target="_blank" className="abtn-ghost">
            Bekijk artikel <LuExternalLink className="text-[13px]" />
          </a>
        )}
      </div>
      <form action={savePost} className="acard overflow-hidden">
        <input type="hidden" name="id" value={p.id} />
        <PostFields p={p} />
        <div className="flex justify-end bg-[#fafafd] px-6 py-4">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}

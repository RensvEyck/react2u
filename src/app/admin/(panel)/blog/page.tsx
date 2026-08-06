import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { deletePost } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { Post } from "@/lib/types";
import { LuPlus, LuExternalLink, LuPencil, LuTrash2, LuUserRound, LuCalendar } from "react-icons/lu";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Concept", cls: "bg-black/[0.06] text-black/50" },
  published: { label: "Live", cls: "bg-[#e6f7f4] text-[#0e9f8a]" },
};

export default async function BlogAdmin() {
  const { sb } = await requirePerm("blog");
  const { data } = await sb.from("posts").select("*").order("created_at", { ascending: false });
  const posts = (data as Post[]) || [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Blog</h1>
          <p className="text-[14.5px] text-black/50">
            Gepubliceerde artikelen verschijnen op /blog en in de sitemap.
          </p>
        </div>
        <Link href="/admin/blog/nieuw" className="abtn"><LuPlus /> Nieuw artikel</Link>
      </div>

      <div className="space-y-2.5">
        {posts.length === 0 && (
          <div className="acard px-6 py-10 text-center text-black/45">
            Nog geen artikelen — schrijf je eerste blog.
          </div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="acard group flex items-center gap-4 px-6 py-4 transition hover:shadow-md">
            {p.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image} alt="" className="h-11 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-11 w-16 shrink-0 rounded-lg bg-[#eef0ff]" />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/admin/blog/${p.id}`} className="text-[15px] font-semibold text-[#1c1a4e] hover:text-[#e75387]">
                {p.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-black/45">
                {p.author && <span className="flex items-center gap-1"><LuUserRound className="text-[11px]" /> {p.author}</span>}
                {p.published_at && (
                  <span className="flex items-center gap-1">
                    <LuCalendar className="text-[11px]" />
                    {new Date(p.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                <span className="text-black/30">/blog/{p.slug}</span>
              </div>
            </div>
            <span className={`apill ${STATUS[p.status]?.cls || STATUS.draft.cls}`}>
              {STATUS[p.status]?.label || p.status}
            </span>
            <div className="flex items-center gap-1 opacity-40 transition group-hover:opacity-100">
              {p.status === "published" && (
                <a href={`/blog/${p.slug}`} target="_blank" className="rounded-lg p-2 text-black/50 hover:bg-black/5 hover:text-[#312e82]" title="Bekijk">
                  <LuExternalLink />
                </a>
              )}
              <Link href={`/admin/blog/${p.id}`} className="rounded-lg p-2 text-black/50 hover:bg-black/5 hover:text-[#e75387]" title="Bewerken">
                <LuPencil />
              </Link>
              <ConfirmButton
                action={deletePost.bind(null, p.id)}
                message={`Artikel "${p.title}" definitief verwijderen?`}
                className="rounded-lg p-2 text-black/50 hover:bg-[#fdeef4] hover:text-[#e0356b]"
              >
                <LuTrash2 />
              </ConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

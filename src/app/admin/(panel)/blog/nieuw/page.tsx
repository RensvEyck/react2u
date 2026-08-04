import Link from "next/link";
import { savePost } from "@/app/admin/actions";
import PostFields from "@/components/admin/PostFields";
import { LuArrowLeft } from "react-icons/lu";

export default function NewPost() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blog" className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-black/45 hover:text-[#e75387]">
          <LuArrowLeft className="text-[12px]" /> Alle artikelen
        </Link>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Nieuw artikel</h1>
      </div>
      <form action={savePost} className="acard overflow-hidden">
        <PostFields />
        <div className="flex justify-end bg-[#fafafd] px-6 py-4">
          <button className="abtn">Opslaan</button>
        </div>
      </form>
    </div>
  );
}

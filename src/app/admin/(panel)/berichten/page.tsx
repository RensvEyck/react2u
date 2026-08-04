import { requireAdmin } from "@/lib/admin";
import { toggleMessageRead } from "@/app/admin/actions";
import type { ContactMessage } from "@/lib/types";

export default async function MessagesAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("contact_messages").select("*").order("created_at", { ascending: false });
  const msgs = (data as ContactMessage[]) || [];
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#312e82] mb-8">Berichten</h1>
      {msgs.length === 0 && <p className="text-black/50">Nog geen berichten ontvangen.</p>}
      <div className="space-y-4">
        {msgs.map((m) => (
          <div key={m.id} className={`rounded-2xl bg-white p-6 shadow-sm ${m.read ? "opacity-70" : "border-l-4 border-[#e75387]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold text-[#312e82]">{m.subject || "(geen onderwerp)"}</p>
                <p className="text-sm text-black/60">
                  {m.name} · <a href={`mailto:${m.email}`} className="text-[#e75387] hover:underline">{m.email}</a> ·{" "}
                  {new Date(m.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <form action={toggleMessageRead.bind(null, m.id, !m.read)}>
                <button className="text-sm text-black/50 hover:text-[#e75387] underline">
                  {m.read ? "Markeer als ongelezen" : "Markeer als gelezen"}
                </button>
              </form>
            </div>
            <p className="mt-3 whitespace-pre-line text-[15px]">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

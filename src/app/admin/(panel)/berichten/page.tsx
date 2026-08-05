import { requireAdmin } from "@/lib/admin";
import { toggleMessageRead } from "@/app/admin/actions";
import type { ContactMessage } from "@/lib/types";
import { LuMailOpen, LuMail } from "react-icons/lu";

export default async function MessagesAdmin() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("contact_messages").select("*").order("created_at", { ascending: false });
  const msgs = (data as ContactMessage[]) || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Berichten</h1>
        <p className="text-[14.5px] text-black/50">Binnengekomen via het contactformulier op de website.</p>
      </div>

      {msgs.length === 0 && (
        <div className="acard px-6 py-10 text-center text-black/45">Nog geen berichten ontvangen.</div>
      )}

      <div className="space-y-3">
        {msgs.map((m) => (
          <div key={m.id} className={`acard p-6 ${m.read ? "opacity-75" : "border-l-[3px] border-l-[#e75387]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#e75387]" />}
                  <p className="text-[15.5px] font-bold text-[#1c1a4e]">{m.subject || "(geen onderwerp)"}</p>
                </div>
                <p className="mt-0.5 text-[13px] text-black/45">
                  {m.name} · <a href={`mailto:${m.email}`} className="font-medium text-[#e75387] hover:underline">{m.email}</a>
                  {m.phone && (
                    <>
                      {" · "}
                      <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="font-semibold text-[#e75387] hover:underline">
                        {m.phone}
                      </a>
                    </>
                  )}{" "}
                  · {new Date(m.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <form action={toggleMessageRead.bind(null, m.id, !m.read)}>
                <button className="abtn-ghost !py-1.5 text-[13px]">
                  {m.read ? <><LuMail className="text-[13px]" /> Markeer ongelezen</> : <><LuMailOpen className="text-[13px]" /> Markeer gelezen</>}
                </button>
              </form>
            </div>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-black/70">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

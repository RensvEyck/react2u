import Link from "next/link";
import { requirePerm } from "@/lib/admin";
import { toggleMessageRead, setApplicationStatus, addLeadFromInbox, deleteMessage, deleteApplication } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusSelect from "@/components/admin/StatusSelect";
import type { Application, ContactMessage } from "@/lib/types";
import {
  LuMail, LuMailOpen, LuPhone, LuPhoneCall, LuFileText, LuInbox, LuUsers, LuMessageSquare, LuTrash2,
} from "react-icons/lu";

const STATUS_OPTIONS: [string, string][] = [
  ["nieuw", "Nieuw"],
  ["in_behandeling", "In behandeling"],
  ["afgewezen", "Afgewezen"],
  ["aangenomen", "Aangenomen"],
];

const FILTERS = [
  { key: "alles", label: "Alles" },
  { key: "ongelezen", label: "Ongelezen" },
  { key: "berichten", label: "Berichten" },
  { key: "sollicitaties", label: "Sollicitaties" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

// Eén stroom uit twee tabellen. "Onbehandeld" is per soort anders gedefinieerd:
// een bericht is ongelezen tot je het aanvinkt, een sollicitatie tot je de
// status van "nieuw" af haalt.
type InboxItem =
  | { kind: "bericht"; id: string; at: string; unread: boolean; msg: ContactMessage }
  | { kind: "sollicitatie"; id: string; at: string; unread: boolean; app: Application };

function fmt(d: string) {
  return new Date(d).toLocaleString("nl-NL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function InboxAdmin({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: raw } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === raw) ? (raw as Filter) : "alles";

  const { sb } = await requirePerm("postvak");
  const [msgsRes, appsRes, leadsRes] = await Promise.all([
    sb.from("contact_messages").select("*").order("created_at", { ascending: false }),
    sb.from("applications").select("*").order("created_at", { ascending: false }),
    // Alleen de herkomst — genoeg om per kaart te weten of hij al op de bellijst staat.
    sb.from("leads").select("source_id").not("source_id", "is", null),
  ]);
  const onList = new Set(
    ((leadsRes.data as { source_id: string }[]) || []).map((l) => l.source_id)
  );

  const items: InboxItem[] = [
    ...(((msgsRes.data as ContactMessage[]) || []).map((m) => ({
      kind: "bericht" as const, id: m.id, at: m.created_at, unread: !m.read, msg: m,
    }))),
    ...(((appsRes.data as Application[]) || []).map((a) => ({
      kind: "sollicitatie" as const, id: a.id, at: a.created_at, unread: a.status === "nieuw", app: a,
    }))),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const counts = {
    alles: items.length,
    ongelezen: items.filter((i) => i.unread).length,
    berichten: items.filter((i) => i.kind === "bericht").length,
    sollicitaties: items.filter((i) => i.kind === "sollicitatie").length,
  };

  const shown = items.filter((i) =>
    filter === "ongelezen" ? i.unread :
    filter === "berichten" ? i.kind === "bericht" :
    filter === "sollicitaties" ? i.kind === "sollicitatie" :
    true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[26px] font-bold text-[#312e82]">Postvak IN</h1>
        <p className="text-[14.5px] text-black/50">
          Alles wat via de website binnenkomt — contactberichten en sollicitaties — op volgorde van binnenkomst.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Link
              key={f.key}
              href={f.key === "alles" ? "/admin/postvak-in" : `/admin/postvak-in?filter=${f.key}`}
              className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition ${
                active
                  ? "border-[#312e82] bg-[#312e82] text-white"
                  : "border-black/12 bg-white text-[#312e82] hover:border-[#312e82]"
              }`}
            >
              {f.label}
              <span className={`ml-2 text-[12px] ${active ? "text-white/60" : "text-black/35"}`}>
                {counts[f.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div className="acard px-6 py-12 text-center">
          <LuInbox className="mx-auto text-[28px] text-black/20" />
          <p className="mt-3 text-[14.5px] text-black/45">
            {filter === "ongelezen" ? "Niets meer te behandelen — alles is bijgewerkt." : "Nog niets ontvangen."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {shown.map((item) =>
          item.kind === "bericht" ? (
            <MessageCard key={`m-${item.id}`} m={item.msg} onList={onList.has(item.id)} />
          ) : (
            <ApplicationCard key={`a-${item.id}`} a={item.app} onList={onList.has(item.id)} />
          )
        )}
      </div>
    </div>
  );
}

function TypeTag({ kind }: { kind: "bericht" | "sollicitatie" }) {
  return kind === "bericht" ? (
    <span className="apill bg-[#fff4e5] text-[#c77700]">
      <LuMessageSquare className="text-[12px]" /> Bericht
    </span>
  ) : (
    <span className="apill bg-[#eef0ff] text-[#312e82]">
      <LuUsers className="text-[12px]" /> Sollicitatie
    </span>
  );
}

/**
 * Zet deze inzending op de bellijst, of laat zien dat dat al gebeurd is.
 *
 * Staat hij er eenmaal op, dan verdwijnt de knop. Twee keer indrukken kán geen
 * kwaad — de unieke index op `source_id` vangt het af — maar een knop die er
 * nog staat suggereert dat er nog iets te doen valt.
 */
function CallListButton({
  kind, id, onList,
}: { kind: "bericht" | "sollicitatie"; id: string; onList: boolean }) {
  if (onList)
    return (
      <Link href="/admin/bellijst" className="apill bg-[#e6f7f4] text-[#0e9f8a] hover:underline">
        <LuPhoneCall className="text-[12px]" /> Staat op de bellijst
      </Link>
    );
  return (
    <form action={addLeadFromInbox.bind(null, kind, id)}>
      <button className="abtn-ghost !py-1.5 text-[13px]">
        <LuPhoneCall className="text-[13px]" /> Op bellijst
      </button>
    </form>
  );
}

function MessageCard({ m, onList }: { m: ContactMessage; onList: boolean }) {
  return (
    <div className={`acard p-6 ${m.read ? "opacity-75" : "border-l-[3px] border-l-[#e75387]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#e75387]" />}
            <TypeTag kind="bericht" />
            <p className="text-[15.5px] font-bold text-[#1c1a4e]">{m.subject || "(geen onderwerp)"}</p>
          </div>
          <p className="mt-1 text-[13px] text-black/45">
            {m.name} ·{" "}
            <a href={`mailto:${m.email}`} className="font-medium text-[#e75387] hover:underline">{m.email}</a>
            {m.phone && (
              <>
                {" · "}
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="font-semibold text-[#e75387] hover:underline">
                  {m.phone}
                </a>
              </>
            )}{" "}
            · {fmt(m.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CallListButton kind="bericht" id={m.id} onList={onList} />
          <ConfirmButton
            action={deleteMessage.bind(null, m.id)}
            message={`Bericht van ${m.name} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`}
            className="rounded-lg p-2 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]"
          >
            <LuTrash2 className="text-[15px]" />
          </ConfirmButton>
          <form action={toggleMessageRead.bind(null, m.id, !m.read)}>
            <button className="abtn-ghost !py-1.5 text-[13px]">
              {m.read ? <><LuMail className="text-[13px]" /> Markeer ongelezen</> : <><LuMailOpen className="text-[13px]" /> Markeer gelezen</>}
            </button>
          </form>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-black/70">{m.message}</p>
    </div>
  );
}

function ApplicationCard({ a, onList }: { a: Application; onList: boolean }) {
  return (
    <div className={`acard p-6 ${a.status === "nieuw" ? "border-l-[3px] border-l-[#312e82]" : "opacity-75"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[16px] font-bold text-[#312e82]">
            {(a.name[0] || "?").toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <TypeTag kind="sollicitatie" />
              <p className="text-[16px] font-bold text-[#1c1a4e]">{a.name}</p>
            </div>
            <p className="mt-1 text-[13px] text-black/45">
              {a.vacancy_title || "Open sollicitatie"} · {fmt(a.created_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-[13.5px]">
              <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                <LuMail className="text-[13px]" /> {a.email}
              </a>
              {a.phone && (
                <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 font-medium text-[#e75387] hover:underline">
                  <LuPhone className="text-[13px]" /> {a.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CallListButton kind="sollicitatie" id={a.id} onList={onList} />
          {a.cv_path && (
            <a href={`/admin/cv?path=${encodeURIComponent(a.cv_path)}`} target="_blank" className="abtn-ghost !py-1.5 text-[13px]">
              <LuFileText className="text-[13px]" /> CV bekijken
            </a>
          )}
          <StatusSelect action={setApplicationStatus.bind(null, a.id)} current={a.status} options={STATUS_OPTIONS} />
          <ConfirmButton
            action={deleteApplication.bind(null, a.id)}
            message={`Sollicitatie van ${a.name} definitief verwijderen, inclusief het cv? Dit kan niet ongedaan worden gemaakt.`}
            className="rounded-lg p-2 text-black/40 hover:bg-[#fdeef4] hover:text-[#e0356b]"
          >
            <LuTrash2 className="text-[15px]" />
          </ConfirmButton>
        </div>
      </div>
      {a.motivation && (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-[#fafafd] p-4 text-[14px] leading-relaxed text-black/70">
          {a.motivation}
        </p>
      )}
    </div>
  );
}

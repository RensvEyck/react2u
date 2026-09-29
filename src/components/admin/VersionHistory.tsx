import { restoreRevision } from "@/app/admin/actions";
import { actorName, type Version } from "@/lib/revisions";
import { when } from "@/lib/dashboard";
import ConfirmButton from "./ConfirmButton";
import { LuHistory, LuRotateCcw, LuChevronDown } from "react-icons/lu";

const VISIBLE = 6;

/**
 * Versiegeschiedenis van één pagina, artikel of vacature.
 *
 * Elke opslag is een versie. Terugzetten schrijft die versie terug als nieuwe
 * opslag, dus ook dat is weer ongedaan te maken — daarom hoeft de bevestiging
 * niet dreigend te zijn.
 */
export default function VersionHistory({
  versions, currentUserId, back, canRestore, title = "Versiegeschiedenis",
}: {
  versions: Version[];
  currentUserId: string;
  back: string;
  canRestore: boolean;
  title?: string;
}) {
  if (versions.length === 0) return null;
  const recent = versions.slice(0, VISIBLE);
  const older = versions.slice(VISIBLE);

  return (
    <section className="acard overflow-hidden">
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-6 py-4">
        <LuHistory className="text-[16px] text-black/35" />
        <h2 className="font-heading text-[16px] font-bold text-[#312e82]">{title}</h2>
        <span className="ml-auto text-[12.5px] text-black/40">
          {versions.length} {versions.length === 1 ? "versie" : "versies"}
        </span>
      </div>
      <ol className="px-6 py-2">
        {recent.map((v) => <Row key={v.id} v={v} currentUserId={currentUserId} back={back} canRestore={canRestore} />)}
      </ol>
      {older.length > 0 && (
        <details className="group border-t border-black/[0.05]">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-6 py-3 text-[13px] font-semibold text-[#312e82] [&::-webkit-details-marker]:hidden">
            {older.length} oudere {older.length === 1 ? "versie" : "versies"}
            <LuChevronDown className="text-[13px] transition group-open:rotate-180" />
          </summary>
          <ol className="px-6 pb-2">
            {older.map((v) => <Row key={v.id} v={v} currentUserId={currentUserId} back={back} canRestore={canRestore} />)}
          </ol>
        </details>
      )}
    </section>
  );
}

function Row({ v, currentUserId, back, canRestore }: { v: Version; currentUserId: string; back: string; canRestore: boolean }) {
  const who = actorName(v, currentUserId);
  return (
    <li className="relative flex items-start gap-3.5 py-3 pl-5 before:absolute before:bottom-0 before:left-[5px] before:top-0 before:w-px before:bg-black/[0.08] first:before:top-5 last:before:bottom-auto last:before:h-5">
      <span
        className={`absolute left-0 top-[18px] h-[11px] w-[11px] rounded-full border-2 ${
          v.current ? "border-[#0e9f8a] bg-[#0e9f8a]" : "border-black/20 bg-white"
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[14px]">
          <span className="font-semibold text-[#1c1a4e]">{when(v.created_at)}</span>
          <span className="text-black/45">{who ? `door ${who === "Jij" ? "jou" : who}` : "beginversie"}</span>
          {v.current && <span className="apill bg-[#e6f7f4] !px-2 !py-0 !text-[11px] text-[#0e9f8a]">Live</span>}
        </p>
        {v.changed.length > 0 && (
          <p className="mt-0.5 text-[12.5px] text-black/45">Gewijzigd: {v.changed.join(", ")}</p>
        )}
      </div>
      {!v.current && canRestore && (
        <ConfirmButton
          action={restoreRevision.bind(null, v.id, back)}
          message={`De versie van ${when(v.created_at)} terugzetten? De huidige versie blijft bewaard, dus je kunt altijd terug.`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#312e82] transition hover:bg-[#eef0ff]"
        >
          <LuRotateCcw className="text-[13px]" /> Terugzetten
        </ConfirmButton>
      )}
    </li>
  );
}

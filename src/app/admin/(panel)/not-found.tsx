import Link from "next/link";
import { LuSearchX, LuArrowLeft } from "react-icons/lu";

// Voor notFound() in een adminscherm: een verwijderde pagina, een oud blok-id
// in een bladwijzer. Blijft binnen het paneel, met menu en zoekbalk.
export default function AdminNotFound() {
  return (
    <div className="acard mx-auto mt-6 flex max-w-[520px] flex-col items-center px-8 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[22px] text-[#312e82]">
        <LuSearchX />
      </span>
      <h1 className="mt-4 font-heading text-[22px] font-bold text-[#312e82]">Niet gevonden</h1>
      <p className="mt-1.5 text-[14.5px] text-black/50">
        Dit onderdeel bestaat niet (meer). Misschien is het verwijderd, of is de link verouderd.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/admin" className="abtn"><LuArrowLeft className="text-[14px]" /> Naar het dashboard</Link>
      </div>
      <p className="mt-5 text-[12.5px] text-black/35">
        Of druk op <kbd className="akbd">⌘K</kbd> en zoek wat je nodig hebt.
      </p>
    </div>
  );
}

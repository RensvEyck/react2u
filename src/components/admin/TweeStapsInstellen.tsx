"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LuShieldCheck, LuSmartphone, LuCopy, LuCheck } from "react-icons/lu";

/**
 * Tweestapsverificatie instellen: QR tonen, code laten bevestigen.
 *
 * Staat los van een pagina omdat het op twee plekken nodig is — direct na het
 * inloggen (voor wie het nog niet heeft) en later via Account. De verificatie
 * aan het eind tilt de huidige sessie meteen naar aal2, zodat je na het
 * instellen niet opnieuw hoeft in te loggen.
 */
export default function TweeStapsInstellen({ onKlaar }: { onKlaar: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [geheim, setGeheim] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);
  const gestart = useRef(false);

  useEffect(() => {
    // Eén inschrijving per scherm. React draait effecten in dev bewust twee
    // keer; twee gelijktijdige inschrijvingen gaven bij Supabase een 500 op de
    // tweede, en in het ergste geval een QR-code die niet bij de factor hoort.
    if (gestart.current) return;
    gestart.current = true;
    (async () => {
      const sb = supabaseBrowser();
      // Een eerdere, nooit afgemaakte poging blokkeert een nieuwe inschrijving.
      const { data: bestaand } = await sb.auth.mfa.listFactors();
      for (const f of bestaand?.all ?? []) {
        if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      // De naam moet per account uniek zijn. Alleen de datum gaf een fout als je
      // op dezelfde dag een nieuwe telefoon instelde; met tijd erbij niet.
      const { data, error } = await sb.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `React2u ${new Date().toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "medium" })}`,
      });
      if (error || !data) {
        setFout("Instellen kon niet worden gestart: " + (error?.message ?? "onbekende fout"));
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setGeheim(data.totp.secret);
    })();
  }, []);

  async function bevestig(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) {
      setBezig(false);
      setFout("Die code klopt niet. Let op: hij verandert elke 30 seconden.");
      return;
    }
    // Nieuwe telefoon: de vorige authenticator eraf. Anders bleven er twee
    // staan, en vroeg het inlogscherm de code van de eerste, mogelijk de
    // telefoon die je net kwijt bent. De sessie staat nu op aal2 met de nieuwe,
    // dus de oude verwijderen mag.
    const { data: alle } = await sb.auth.mfa.listFactors();
    for (const f of alle?.all ?? []) {
      if (f.id !== factorId) await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    setBezig(false);
    onKlaar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-[#eef0ff] px-4 py-3 text-[13px] text-[#312e82]">
        <LuSmartphone className="mt-0.5 shrink-0 text-[15px]" />
        <p>
          Heb je nog geen authenticator-app? Installeer bijvoorbeeld <strong>Google Authenticator</strong>,
          <strong> Microsoft Authenticator</strong> of <strong>1Password</strong> op je telefoon.
        </p>
      </div>

      {fout && !qr && (
        <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{fout}</p>
      )}

      {!qr && !fout && <p className="py-4 text-center text-[14px] text-black/45">Bezig met voorbereiden…</p>}

      {qr && (
        <form onSubmit={bevestig} className="space-y-4">
          <ol className="space-y-3 text-[13.5px] text-black/70">
            <li><strong>1.</strong> Open je authenticator-app en kies &quot;account toevoegen&quot;.</li>
            <li>
              <strong>2.</strong> Scan deze code:
              <span className="mt-2 block rounded-xl border border-black/[0.08] bg-white p-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR-code voor je authenticator-app" className="mx-auto h-44 w-44" />
              </span>
              <span className="mt-2 block text-[12.5px] text-black/45">
                Lukt scannen niet? Voer deze sleutel handmatig in:
              </span>
              <span className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[12px]">{geheim}</code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(geheim); setGekopieerd(true); setTimeout(() => setGekopieerd(false), 2000); }}
                  className="abtn-ghost shrink-0 !py-1.5 text-[12.5px]"
                >
                  {gekopieerd ? <><LuCheck className="text-[12px]" /> Gekopieerd</> : <><LuCopy className="text-[12px]" /> Kopieer</>}
                </button>
              </span>
            </li>
            <li><strong>3.</strong> Typ de zescijferige code die de app toont:</li>
          </ol>

          <input
            className="ainput text-center text-[20px] tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            required
          />
          {fout && <p className="rounded-xl bg-[#fdeef4] px-4 py-3 text-[13.5px] font-medium text-[#e0356b]">{fout}</p>}
          <button className="abtn w-full justify-center !py-3" disabled={bezig || code.length !== 6}>
            <LuShieldCheck className="text-[14px]" /> {bezig ? "Controleren…" : "Inschakelen"}
          </button>
          <p className="text-[12.5px] text-black/45">
            Raak je je telefoon kwijt, dan kan een collega met het recht <em>Gebruikers</em> je
            tweestapsverificatie opnieuw instellen.
          </p>
        </form>
      )}
    </div>
  );
}

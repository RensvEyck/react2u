"use client";
import { useState } from "react";
import ConfirmButton from "./ConfirmButton";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { LuChevronDown, LuTrash2, LuPlus, LuShieldCheck } from "react-icons/lu";

type Role = { id: string; label: string; permissions: Permission[]; isSystem: boolean };

/**
 * Eén rol met zijn rechten, uitklapbaar.
 *
 * Zonder `role` is dit het formulier voor een nieuwe rol.
 *
 * De systeemrol (beheerder) toont zijn vinkjes wel maar laat ze niet wijzigen:
 * die rol is het vangnet waar de toegang van iedereen aan hangt. De server
 * dwingt dat nog een keer af — dit veld uitschakelen is comfort, geen grens.
 */
export default function RoleEditor({
  role, save, remove,
}: {
  role?: Role;
  save: (formData: FormData) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const isNew = !role;
  const [open, setOpen] = useState(false);
  const locked = Boolean(role?.isSystem);

  if (isNew && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="abtn-ghost !py-2 text-[13.5px]">
        <LuPlus className="text-[14px]" /> Rol toevoegen
      </button>
    );
  }

  return (
    <form action={save} className="rounded-xl border border-black/[0.08] bg-white">
      {role && <input type="hidden" name="id" value={role.id} />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
      >
        <LuChevronDown className={`shrink-0 text-[15px] text-black/35 transition ${open ? "" : "-rotate-90"}`} />
        <span className="flex-1 text-[14.5px] font-semibold text-[#1c1a4e]">
          {role ? role.label : "Nieuwe rol"}
          {locked && (
            <span className="ml-2 apill bg-[#eef0ff] text-[#312e82]">
              <LuShieldCheck className="text-[11px]" /> vaste rol
            </span>
          )}
        </span>
        {role && (
          <span className="text-[12.5px] text-black/35">
            {role.permissions.length} van {PERMISSIONS.length} onderdelen
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-black/[0.06] px-5 py-4">
          <div className="mb-4 max-w-[320px]">
            <label className="alabel">Naam van de rol</label>
            <input
              className="ainput"
              name="label"
              defaultValue={role?.label || ""}
              placeholder="bijv. Receptie"
              required
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((p) => (
              <label
                key={p.key}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${locked ? "opacity-60" : "hover:bg-[#fafafd]"}`}
              >
                <input
                  type="checkbox"
                  name={`perm.${p.key}`}
                  defaultChecked={locked || role?.permissions.includes(p.key)}
                  disabled={locked}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#e75387]"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-[#1c1a4e]">{p.label}</span>
                  <span className="block text-[12px] text-black/40">{p.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {locked && (
            <p className="mt-3 text-[12.5px] text-black/45">
              Deze rol houdt altijd alle rechten. Er moet er één zijn die gebruikers kan beheren,
              anders sluit je iedereen buiten — ook jezelf.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            {remove ? (
              <ConfirmButton
                action={remove}
                message={`Rol "${role?.label}" verwijderen? Dit kan alleen als er niemand aan gekoppeld is.`}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-[#e0356b] hover:bg-[#fdeef4]"
              >
                <LuTrash2 className="text-[13px]" /> Verwijderen
              </ConfirmButton>
            ) : <span />}
            <button className="abtn !py-2 text-[13.5px]">{isNew ? "Rol aanmaken" : "Opslaan"}</button>
          </div>
        </div>
      )}
    </form>
  );
}

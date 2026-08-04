"use client";
import { useState } from "react";
import MediaPicker from "./MediaPicker";
import { LuImage } from "react-icons/lu";

/** Tekstveld met een knop die de mediabibliotheek opent, plus een miniatuur. */
export default function ImageField({
  name, label, defaultValue, placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue || "");
  const [picking, setPicking] = useState(false);

  return (
    <div>
      <label className="alabel">{label}</label>
      <div className="flex gap-3">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.08] bg-[#fafafd]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <LuImage className="text-[16px] text-black/20" />
          )}
        </div>
        <input
          className="ainput"
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="button" onClick={() => setPicking(true)} className="abtn-ghost shrink-0 !py-2 text-[13px]">
          <LuImage className="text-[13px]" /> Kies
        </button>
      </div>
      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onSelect={(url) => { setValue(url); setPicking(false); }}
        />
      )}
    </div>
  );
}

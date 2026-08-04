"use client";
import { useState } from "react";
import Link from "next/link";
import { MAIN_NAV, LOGO_URL } from "@/lib/nav";
import type { ContactInfo } from "@/lib/content";
import { FaPhoneAlt, FaEnvelope, FaBars, FaTimes, FaChevronDown } from "react-icons/fa";

export default function Header({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-50 bg-white">
      {/* Topbar */}
      <div className="bg-soft border-b border-black/5">
        <div className="container-site flex items-center justify-between py-2 text-[15px]">
          <div className="flex items-center gap-6">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-primary hover:text-accent">
              <FaPhoneAlt className="text-[13px]" /> {contact.phoneDisplay}
            </a>
            <a href={`mailto:${contact.email}`} className="hidden sm:flex items-center gap-2 text-primary hover:text-accent">
              <FaEnvelope className="text-[13px]" /> {contact.email}
            </a>
          </div>
          <span className="hidden md:block text-primary/70">Jouw mensen, onze aandacht!</span>
        </div>
      </div>
      {/* Main bar */}
      <div className="container-site flex items-center justify-between py-4">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="React2u" width={144} height={89} className="h-[70px] w-auto" />
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          {MAIN_NAV.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className="flex items-center gap-1 font-medium text-primary hover:text-accent py-4"
              >
                {item.label}
                {item.children && <FaChevronDown className="text-[10px] opacity-60" />}
              </Link>
              {item.children && (
                <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-xl rounded-xl py-3 min-w-[260px] border border-black/5">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="block px-5 py-2 text-[16px] text-body hover:text-accent hover:bg-soft"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <button
          className="lg:hidden text-primary text-2xl p-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Menu sluiten" : "Menu openen"}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-black/5 bg-white pb-6">
          <div className="container-site flex flex-col gap-1 pt-4">
            {MAIN_NAV.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 font-medium text-primary text-lg"
                >
                  {item.label}
                </Link>
                {item.children?.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="block py-1.5 pl-4 text-body"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

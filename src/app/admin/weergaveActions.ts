"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { kanWisselen } from "@/lib/permissions";
import { WEERGAVE_COOKIE } from "@/lib/weergave";

/** Wisselen tussen Beheer en Mijn React2u; deze browser onthoudt de keuze een jaar. */
export async function wisselWeergave(naar: "mijn" | "beheer") {
  const { admin } = await requireAdmin();
  const store = await cookies();
  if (naar === "mijn" && kanWisselen(admin.permissions)) {
    store.set(WEERGAVE_COOKIE, "mijn", { path: "/admin", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete({ name: WEERGAVE_COOKIE, path: "/admin" });
  }
  redirect("/admin");
}

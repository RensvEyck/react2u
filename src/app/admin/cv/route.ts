import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const { sb } = await requireAdmin();
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path ontbreekt" }, { status: 400 });
  const { data, error } = await sb.storage.from("cvs").createSignedUrl(path, 60 * 10);
  if (error || !data) return NextResponse.json({ error: "CV niet gevonden" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

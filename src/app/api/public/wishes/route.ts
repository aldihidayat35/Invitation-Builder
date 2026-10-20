import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { listPublicWishesBySlug } from "@/features/rsvp/service";

export const dynamic = "force-dynamic";

/**
 * Public endpoint to fetch live RSVP wishes and guestbook comments for an invitation.
 * Open to public without session (capability: slug).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Parameter slug undangan wajib disertakan." },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const wishes = await listPublicWishesBySlug(db, slug);
    return NextResponse.json({ ok: true, wishes });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Gagal memuat ucapan doa restu.",
      },
      { status: 500 },
    );
  }
}

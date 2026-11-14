import { NextRequest, NextResponse } from "next/server";
import { processPortalAudioUpload } from "@/features/orders/portal-audio";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token");
    const file = formData.get("file");

    if (typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { ok: false, error: "Token akses portal tidak valid." },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Berkas audio tidak ditemukan." },
        { status: 400 },
      );
    }

    const res = await processPortalAudioUpload(token, file);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error || "Gagal mengunggah berkas audio." },
        { status: 400 },
      );
    }

    return NextResponse.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

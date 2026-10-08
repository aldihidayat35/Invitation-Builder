import { NextResponse } from "next/server";
import { getAdminAppSettings, saveAdminAppSettings } from "@/features/admin/api";

export async function GET() {
  try {
    const settings = await getAdminAppSettings();
    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil pengaturan";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await saveAdminAppSettings(body);
    return NextResponse.json({ ok: true, data: updated, message: "Pengaturan aplikasi berhasil disimpan" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

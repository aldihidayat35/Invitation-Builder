import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import {
  createGlobalVariablePreset,
  listGlobalVariablePresets,
} from "@/lib/db/repositories/global-presets";

export async function GET() {
  try {
    const db = await getDb();
    const presets = await listGlobalVariablePresets(db);
    return NextResponse.json({ ok: true, data: presets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil daftar preset global";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, label, category, type, defaultValue, description, maxLength } = body;

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ ok: false, error: "Kunci variabel (key) wajib diisi" }, { status: 400 });
    }

    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ ok: false, error: "Nama label variabel wajib diisi" }, { status: 400 });
    }

    const db = await getDb();
    const created = await createGlobalVariablePreset(db, {
      key: key.trim(),
      label: label.trim(),
      category: typeof category === "string" ? category.trim() : "kustom",
      type: typeof type === "string" ? type.trim() : "text",
      defaultValue: typeof defaultValue === "string" ? defaultValue : "",
      description: typeof description === "string" ? description : "",
      maxLength: typeof maxLength === "number" && !isNaN(maxLength) && maxLength > 0 ? maxLength : null,
    });

    return NextResponse.json({
      ok: true,
      data: created,
      message: "Preset global berhasil disimpan",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan preset global";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

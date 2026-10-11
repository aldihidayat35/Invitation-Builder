import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import {
  deleteGlobalVariablePreset,
  getGlobalVariablePresetById,
  updateGlobalVariablePreset,
} from "@/lib/db/repositories/global-presets";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { label, category, defaultValue, description, maxLength } = body;

    const db = await getDb();
    const existing = await getGlobalVariablePresetById(db, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Preset tidak ditemukan" }, { status: 404 });
    }

    const updated = await updateGlobalVariablePreset(db, id, {
      label: typeof label === "string" ? label.trim() : undefined,
      category: typeof category === "string" ? category.trim() : undefined,
      defaultValue: typeof defaultValue === "string" ? defaultValue : undefined,
      description: typeof description === "string" ? description : undefined,
      maxLength: typeof maxLength === "number" && !isNaN(maxLength) ? maxLength : maxLength === null ? null : undefined,
    });

    return NextResponse.json({
      ok: true,
      data: updated,
      message: "Preset global berhasil diperbarui",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui preset global";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const deleted = await deleteGlobalVariablePreset(db, id);

    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Preset tidak ditemukan atau sudah dihapus" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Preset global berhasil dihapus",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus preset global";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

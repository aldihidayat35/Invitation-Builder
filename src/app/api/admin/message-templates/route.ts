import { NextResponse } from "next/server";
import {
  getAdminMessageTemplates,
  addAdminMessageTemplate,
  editAdminMessageTemplate,
  setAdminMessageTemplateDefault,
  removeAdminMessageTemplate,
} from "@/features/admin/api";

export async function GET() {
  try {
    const items = await getAdminMessageTemplates();
    return NextResponse.json({ ok: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat template pesan";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Judul template dan isi format pesan wajib diisi." },
        { status: 400 },
      );
    }

    const created = await addAdminMessageTemplate({
      category: body.category || "wedding",
      title: body.title,
      content: body.content,
      isDefault: Boolean(body.isDefault),
      sortOrder: Number(body.sortOrder) || 0,
    });

    return NextResponse.json({
      ok: true,
      data: created,
      message: "Template pesan berhasil dibuat.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat template pesan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ ok: false, error: "ID template wajib disertakan." }, { status: 400 });
    }

    const updated = await editAdminMessageTemplate(body.id, {
      category: body.category,
      title: body.title,
      content: body.content,
      isDefault: body.isDefault,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({
      ok: true,
      data: updated,
      message: "Template pesan berhasil diperbarui.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui template";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ ok: false, error: "ID template wajib disertakan." }, { status: 400 });
    }

    if (body.action === "setDefault") {
      const updated = await setAdminMessageTemplateDefault(body.id);
      return NextResponse.json({
        ok: true,
        data: updated,
        message: "Template default berhasil diubah.",
      });
    }

    return NextResponse.json({ ok: false, error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status template";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID template wajib disertakan." }, { status: 400 });
    }

    await removeAdminMessageTemplate(id);

    return NextResponse.json({
      ok: true,
      message: "Template pesan berhasil dihapus.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus template pesan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

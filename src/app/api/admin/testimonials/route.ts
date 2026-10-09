import { NextResponse } from "next/server";
import {
  addAdminTestimonial,
  editAdminTestimonial,
  getAdminTestimonials,
  removeAdminTestimonial,
  setAdminTestimonialActive,
} from "@/features/admin/api";

export async function GET() {
  try {
    const items = await getAdminTestimonials();
    return NextResponse.json({ ok: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat ulasan";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.quote) {
      return NextResponse.json(
        { ok: false, error: "Nama dan isi ulasan (quote) wajib diisi" },
        { status: 400 },
      );
    }

    const created = await addAdminTestimonial({
      name: body.name,
      role: body.role,
      quote: body.quote,
      rating: body.rating,
      avatarUrl: body.avatarUrl,
      initials: body.initials,
      shade: body.shade,
      sortOrder: body.sortOrder,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({
      ok: true,
      data: created,
      message: "Testimoni berhasil ditambahkan",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan ulasan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ ok: false, error: "ID ulasan wajib disertakan" }, { status: 400 });
    }

    const updated = await editAdminTestimonial(body.id, {
      name: body.name,
      role: body.role,
      quote: body.quote,
      rating: body.rating,
      avatarUrl: body.avatarUrl,
      initials: body.initials,
      shade: body.shade,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });

    return NextResponse.json({
      ok: true,
      data: updated,
      message: "Testimoni berhasil diperbarui",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui ulasan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id || typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "ID dan status isActive wajib disertakan" },
        { status: 400 },
      );
    }

    const updated = await setAdminTestimonialActive(body.id, body.isActive);
    return NextResponse.json({
      ok: true,
      data: updated,
      message: `Status ulasan berhasil diubah menjadi ${body.isActive ? "Aktif" : "Nonaktif"}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status ulasan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID ulasan wajib disertakan" }, { status: 400 });
    }

    const deleted = await removeAdminTestimonial(id);
    return NextResponse.json({
      ok: deleted,
      message: "Testimoni berhasil dihapus",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus ulasan";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

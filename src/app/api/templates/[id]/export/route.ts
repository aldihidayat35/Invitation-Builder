import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { exportTemplate, TemplateNotFoundError } from "@/features/templates/api";
import { ForbiddenError } from "@/lib/auth/errors";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/templates/[id]/export">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { filename, buffer } = await exportTemplate(id);
    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Tidak memiliki hak akses." }, { status: 403 });
    }
    return NextResponse.json({ error: "Gagal mengekspor template." }, { status: 500 });
  }
}

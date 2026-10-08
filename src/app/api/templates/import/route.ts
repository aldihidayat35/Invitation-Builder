import { NextResponse } from "next/server";
import { getCurrentUser, getWorkspaceContext } from "@/lib/auth/server";
import { importTemplate, TemplateImportError } from "@/features/templates/api";
import { ForbiddenError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Permintaan form data tidak valid." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Berkas file ZIP wajib diunggah." }, { status: 400 });
  }

  let workspaceId = formData.get("workspaceId") as string | null;
  if (!workspaceId) {
    const { active } = await getWorkspaceContext();
    workspaceId = active?.workspace.id ?? null;
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace tidak ditemukan." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const result = await importTemplate(workspaceId, bytes);

    return NextResponse.json({
      ok: true,
      templateId: result.templateId,
      name: result.name,
      importedAssetsCount: result.importedAssetsCount,
      message: `Template "${result.name}" berhasil diimpor.`,
    });
  } catch (error) {
    if (error instanceof TemplateImportError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Tidak memiliki hak akses untuk mengimpor template." }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengimpor template." },
      { status: 500 },
    );
  }
}

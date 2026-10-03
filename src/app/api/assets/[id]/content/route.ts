import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/errors";
import { ASSET_LIMITS } from "@/lib/schema";
import { AssetNotFoundError, AssetRejectedError, storeUploadContent } from "@/features/assets/api";

/**
 * Local-driver upload target. The app (not the browser) decides limits:
 * the body is rejected if Content-Length is missing/over the cap, and the
 * service compares the real byte count with the size declared at init.
 */
export async function PUT(request: Request, ctx: RouteContext<"/api/assets/[id]/content">) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const declared = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declared) || declared <= 0 || declared > ASSET_LIMITS.imageMaxBytes) {
    return NextResponse.json({ error: "Ukuran berkas tidak valid." }, { status: 413 });
  }
  const data = new Uint8Array(await request.arrayBuffer());

  try {
    await storeUploadContent(id, data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AssetRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("asset upload failed", error);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}

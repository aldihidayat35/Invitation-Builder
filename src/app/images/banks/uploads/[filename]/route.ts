import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

const MIME_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "images", "banks", "uploads", safeFilename);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = safeFilename.split(".").pop()?.toLowerCase() || "png";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Logo not found", { status: 404 });
  }
}

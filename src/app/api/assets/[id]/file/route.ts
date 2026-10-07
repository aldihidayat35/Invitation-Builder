import { readPublicAsset } from "@/features/assets/api";

/**
 * Public media delivery (images, videos, audio).
 * Supports HTTP 206 Partial Content (Range requests) so HTML5 video players can stream,
 * seek, and buffer video smoothly in Chrome, Safari, Firefox, and mobile browsers.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/assets/[id]/file">) {
  const { id } = await ctx.params;
  const asset = await readPublicAsset(id);
  if (!asset) return new Response("Not found", { status: 404 });

  const totalBytes = asset.bytes.byteLength;
  const rangeHeader = request.headers.get("range");

  // Handle HTTP Range header for streaming and seeking (crucial for video/audio)
  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0] ?? "0", 10);
    const end = parts[1] && parts[1].length > 0 ? parseInt(parts[1], 10) : totalBytes - 1;

    if (!isNaN(start) && !isNaN(end) && start <= end && start < totalBytes) {
      const chunkEnd = Math.min(end, totalBytes - 1);
      const chunkSize = chunkEnd - start + 1;
      const chunk = asset.bytes.subarray(start, chunkEnd + 1);

      return new Response(Buffer.from(chunk), {
        status: 206,
        headers: {
          "Content-Type": asset.mimeType,
          "Content-Range": `bytes ${start}-${chunkEnd}/${totalBytes}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return new Response(Buffer.from(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(totalBytes),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

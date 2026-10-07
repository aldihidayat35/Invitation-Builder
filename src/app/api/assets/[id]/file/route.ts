import { readPublicAsset } from "@/features/assets/api";

/**
 * Public image delivery. Only `ready` images are served, always with the
 * validated MIME type (never the client's) and `nosniff`; `default-src 'none'`
 * keeps the response inert even if it were opened as a document.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/assets/[id]/file">) {
  const { id } = await ctx.params;
  const asset = await readPublicAsset(id);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.bytes.byteLength),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

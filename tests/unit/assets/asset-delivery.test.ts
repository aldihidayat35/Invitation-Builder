import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/assets/[id]/file/route";

vi.mock("@/features/assets/api", () => ({
  readPublicAsset: vi.fn(async (id: string) => {
    if (id === "vid-123") {
      const dummyBytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      return {
        bytes: dummyBytes,
        mimeType: "video/mp4",
      };
    }
    if (id === "img-123") {
      const dummyBytes = new Uint8Array([1, 2, 3, 4]);
      return {
        bytes: dummyBytes,
        mimeType: "image/jpeg",
      };
    }
    return null;
  }),
}));

describe("Asset Delivery Route (/api/assets/[id]/file)", () => {
  it("delivers video asset with status 200 when no range requested", async () => {
    const req = new Request("http://localhost/api/assets/vid-123/file");
    const res = await GET(req, { params: Promise.resolve({ id: "vid-123" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(res.headers.get("Content-Length")).toBe("10");
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.length).toBe(10);
  });

  it("handles HTTP 206 Partial Content for video Range requests", async () => {
    const req = new Request("http://localhost/api/assets/vid-123/file", {
      headers: { Range: "bytes=2-5" },
    });
    const res = await GET(req, { params: Promise.resolve({ id: "vid-123" }) });

    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(res.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(res.headers.get("Content-Length")).toBe("4");
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");

    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf).toEqual(new Uint8Array([30, 40, 50, 60]));
  });

  it("returns 404 for non-existent asset", async () => {
    const req = new Request("http://localhost/api/assets/missing/file");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

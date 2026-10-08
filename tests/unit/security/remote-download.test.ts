// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  assertSafeRemoteHttpUrl,
  downloadRemoteImage,
  UnsafeRemoteUrlError,
} from "@/lib/security/remote-download";

describe("remote image download security", () => {
  it.each([
    ["http://localhost/image.png", ["127.0.0.1"]],
    ["http://127.0.0.1/image.png", ["127.0.0.1"]],
    ["http://metadata.internal/image.png", ["169.254.169.254"]],
    ["http://private.example/image.png", ["10.0.0.8"]],
    ["http://ipv6.example/image.png", ["::1"]],
    ["http://mapped-ipv6.example/image.png", ["::ffff:7f00:1"]],
  ])("rejects local or private destination %s", async (url, addresses) => {
    await expect(assertSafeRemoteHttpUrl(url, async () => addresses)).rejects.toThrow(
      UnsafeRemoteUrlError,
    );
  });

  it("allows a verified public HTTPS destination", async () => {
    await expect(
      assertSafeRemoteHttpUrl("https://cdn.example.com/image.png", async () => ["93.184.216.34"]),
    ).resolves.toMatchObject({ hostname: "cdn.example.com", protocol: "https:" });
  });

  it("revalidates redirects and rejects redirects to private networks", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } }),
    ) as unknown as typeof fetch;

    await expect(
      downloadRemoteImage("https://cdn.example.com/image.png", {
        maxBytes: 1024,
        fetchImpl,
        resolveHost: async (hostname) =>
          hostname === "cdn.example.com" ? ["93.184.216.34"] : ["127.0.0.1"],
      }),
    ).rejects.toThrow(UnsafeRemoteUrlError);
  });

  it("stops streaming as soon as the byte limit is exceeded", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array(32), {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    ) as unknown as typeof fetch;

    await expect(
      downloadRemoteImage("https://cdn.example.com/image.png", {
        maxBytes: 16,
        fetchImpl,
        resolveHost: async () => ["93.184.216.34"],
      }),
    ).rejects.toThrow(/Ukuran berkas/);
  });
});

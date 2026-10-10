// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createMigratedDb } from "../helpers/db";
import { updateAppSettings } from "@/lib/db/repositories/settings";
import { createResellerWithProfile } from "@/lib/db/repositories/resellers";
import { GET as handleFavicon } from "@/app/api/app-favicon/route";
import { GET as handleFaviconIco } from "@/app/favicon.ico/route";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  process.env.DATABASE_URL = "pglite://./.data/test-favicon";
  conn = await createMigratedDb();
  (globalThis as unknown as { __invitationDb?: Promise<typeof conn.db> }).__invitationDb =
    Promise.resolve(conn.db);
});

afterAll(async () => {
  delete (globalThis as unknown as { __invitationDb?: unknown }).__invitationDb;
  await conn.close();
});

describe("Dynamic Favicon Endpoint (/api/app-favicon & /favicon.ico)", () => {
  it("serves SVG fallback when appLogo is not configured", async () => {
    await updateAppSettings(db(), { appLogo: null });

    const req = new NextRequest("http://localhost:3000/api/app-favicon");
    const res = await handleFavicon(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    const bodyText = await res.text();
    expect(bodyText).toContain("<svg");
    expect(bodyText).toContain("primaryGrad");
  });

  it("serves decoded buffer when appLogo is a base64 data URL", async () => {
    // 1x1 transparent PNG in base64
    const samplePngBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    await updateAppSettings(db(), { appLogo: samplePngBase64 });

    const req = new NextRequest("http://localhost:3000/api/app-favicon");
    const res = await handleFavicon(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("redirects with 307 when appLogo is an HTTP/HTTPS URL", async () => {
    await updateAppSettings(db(), { appLogo: "https://example.com/custom-logo.png" });

    const req = new NextRequest("http://localhost:3000/api/app-favicon");
    const res = await handleFavicon(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/custom-logo.png");
  });

  it("serves reseller custom logo when ?seller=<slug> is requested", async () => {
    await createResellerWithProfile(db(), {
      email: "reseller-favicon@test.com",
      name: "Reseller Favicon",
      agencyName: "Favicon Wedding Agency",
      slug: "agency-favicon-test",
      whatsappContact: "628123456789",
      logoUrl: "https://example.com/reseller-custom-logo.png",
    });

    const req = new NextRequest("http://localhost:3000/api/app-favicon?seller=agency-favicon-test");
    const res = await handleFavicon(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/reseller-custom-logo.png");
  });

  it("falls back to global appLogo if reseller has no custom logo", async () => {
    await createResellerWithProfile(db(), {
      email: "reseller-nologo@test.com",
      name: "Reseller No Logo",
      agencyName: "No Logo Agency",
      slug: "agency-no-logo",
      whatsappContact: "628123456789",
      logoUrl: null,
    });
    await updateAppSettings(db(), { appLogo: "https://example.com/global-brand.png" });

    const req = new NextRequest("http://localhost:3000/api/app-favicon?seller=agency-no-logo");
    const res = await handleFavicon(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/global-brand.png");
  });

  it("handles /favicon.ico transparently delegating to dynamic favicon handler", async () => {
    await updateAppSettings(db(), { appLogo: null });

    const req = new NextRequest("http://localhost:3000/favicon.ico");
    const res = await handleFaviconIco(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
  });
});

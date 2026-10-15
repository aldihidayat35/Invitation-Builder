import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBaseUrl, absoluteUrl, buildPublicMetadata } from "@/lib/seo/config";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO Helper and Metadata Generation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves canonical base URL in correct priority order", () => {
    // 1. Settings database siteUrl
    expect(getBaseUrl({ siteUrl: "https://my-invitation.com" })).toBe("https://my-invitation.com");
    expect(getBaseUrl({ siteUrl: "https://my-invitation.com/" })).toBe("https://my-invitation.com");

    // 2. NEXT_PUBLIC_SITE_URL environment variable
    process.env.NEXT_PUBLIC_SITE_URL = "https://env-site.com";
    expect(getBaseUrl(null)).toBe("https://env-site.com");

    // 3. APP_HOST environment variable
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.APP_HOST = "app.domain.test";
    expect(getBaseUrl(null)).toBe("https://app.domain.test");

    // 4. Default fallback
    delete process.env.APP_HOST;
    expect(getBaseUrl(null)).toBe("http://localhost:3000");
  });

  it("constructs absolute URLs with clean slashes", () => {
    expect(absoluteUrl("/templates/classic-floral", "https://undangan.id")).toBe(
      "https://undangan.id/templates/classic-floral"
    );
    expect(absoluteUrl("register-reseller", "https://undangan.id/")).toBe(
      "https://undangan.id/register-reseller"
    );
  });

  it("generates full public metadata with OpenGraph and Googlebot directives", () => {
    const meta = buildPublicMetadata({
      title: "Desain Mewah",
      description: "Deskripsi undangan eksklusif",
      canonicalPath: "/templates/royal-elegant",
      keywords: ["custom keyword"],
      ogImage: "https://undangan.id/images/preview.jpg",
      settings: {
        appName: "TestUndangan",
        siteUrl: "https://undangan.id",
      },
    });

    expect(meta.title).toBe("Desain Mewah · TestUndangan");
    expect(meta.description).toBe("Deskripsi undangan eksklusif");
    expect(meta.alternates?.canonical).toBe("https://undangan.id/templates/royal-elegant");
    expect(meta.robots).toEqual(
      expect.objectContaining({
        index: true,
        follow: true,
      })
    );

    const og = meta.openGraph as Record<string, unknown>;
    expect(og.title).toBe("Desain Mewah · TestUndangan");
    expect(og.url).toBe("https://undangan.id/templates/royal-elegant");
    expect(og.siteName).toBe("TestUndangan");

    const tw = meta.twitter as Record<string, unknown>;
    expect(tw.card).toBe("summary_large_image");
  });
});

describe("Robots.txt & Sitemap.xml Dynamic Handlers", () => {
  it("generates robots.txt rules that allow public pages and block private workspaces and client invitations", async () => {
    const robotsConfig = await robots();

    expect(robotsConfig.sitemap).toContain("/sitemap.xml");
    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
    expect(rules).toBeDefined();

    const allow = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    // Must allow public marketing & catalog routes
    expect(allow).toContain("/");
    expect(allow).toContain("/templates");
    expect(allow).toContain("/templates/*");
    expect(allow).toContain("/seller/*");
    expect(allow).toContain("/register-reseller");

    // Must disallow private dashboard, editor, and personal guest invitations (/i/*, /c/*)
    expect(disallow).toContain("/dashboard");
    expect(disallow).toContain("/editor");
    expect(disallow).toContain("/i/*");
    expect(disallow).toContain("/c/*");
  });

  it("generates dynamic sitemap including homepage, registration, and templates", async () => {
    const sitemapEntries = await sitemap();

    expect(sitemapEntries.length).toBeGreaterThan(0);
    const urls = sitemapEntries.map((e) => e.url);

    // Root homepage must be priority 1.0
    const homeEntry = sitemapEntries.find((e) => e.url.endsWith("/"));
    expect(homeEntry).toBeDefined();
    expect(homeEntry?.priority).toBe(1.0);

    // Reseller registration
    const registerEntry = sitemapEntries.find((e) => e.url.includes("/register-reseller"));
    expect(registerEntry).toBeDefined();

    // Template details
    const templateEntry = sitemapEntries.find((e) => e.url.includes("/templates/"));
    expect(templateEntry).toBeDefined();
    expect(templateEntry?.priority).toBe(0.8);
  });
});

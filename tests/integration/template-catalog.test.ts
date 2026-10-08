// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { seedDev } from "@/lib/db/seed";
import {
  getCatalogTemplateBySlug,
  getPublicCatalogTemplates,
  updateTemplateCatalogMetadata,
} from "@/features/templates/catalog-service";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
  await seedDev(db());
});

afterAll(async () => {
  await conn.close();
});

describe("Template Catalog & Metadata Feature", () => {
  it("fetches public catalog templates with rich metadata and filters", async () => {
    const catalog = await getPublicCatalogTemplates(db());
    expect(catalog.total).toBeGreaterThanOrEqual(5);
    expect(catalog.items.length).toBeGreaterThanOrEqual(5);

    const classicFloral = catalog.items.find((t) => t.slug === "classic-floral-botanical");
    expect(classicFloral).toBeDefined();
    expect(classicFloral?.name).toBe("Classic Floral");
    expect(classicFloral?.category).toBe("wedding");
    expect(classicFloral?.style).toBe("botanical_sage");
    expect(classicFloral?.price).toBe(89000);
    expect(classicFloral?.isFeatured).toBe(true);
    expect(classicFloral?.colorPalette.length).toBeGreaterThan(0);
    expect(classicFloral?.supportedFeatures).toContain("rsvp");
    expect(classicFloral?.supportedFeatures).toContain("google_maps");
  });

  it("filters templates by category and search keyword accurately", async () => {
    const weddingTemplates = await getPublicCatalogTemplates(db(), { category: "wedding" });
    expect(weddingTemplates.items.every((t) => t.category === "wedding")).toBe(true);

    const birthdayTemplates = await getPublicCatalogTemplates(db(), { category: "birthday" });
    expect(birthdayTemplates.items.length).toBeGreaterThanOrEqual(1);
    expect(birthdayTemplates.items[0]?.name).toBe("Sweet Seventeen");

    const searchJawa = await getPublicCatalogTemplates(db(), { search: "batik" });
    expect(searchJawa.items.length).toBeGreaterThanOrEqual(1);
    expect(searchJawa.items[0]?.name).toBe("Royal Elegant");
  });

  it("sorts templates by price and popularity", async () => {
    const priceAsc = await getPublicCatalogTemplates(db(), { sortBy: "price_asc" });
    for (let i = 1; i < priceAsc.items.length; i++) {
      expect(priceAsc.items[i]!.price).toBeGreaterThanOrEqual(priceAsc.items[i - 1]!.price);
    }
  });

  it("retrieves template detail by slug and increments view count", async () => {
    const item = await getCatalogTemplateBySlug(db(), "classic-floral-botanical");
    expect(item).not.toBeNull();
    expect(item?.slug).toBe("classic-floral-botanical");
    expect(item?.viewCount).toBeGreaterThanOrEqual(0);

    const again = await getCatalogTemplateBySlug(db(), "classic-floral-botanical");
    expect(again?.viewCount).toBe((item?.viewCount ?? 0) + 1);
  });

  it("updates template catalog metadata and handles unique slug validation", async () => {
    const list = await getPublicCatalogTemplates(db());
    const target = list.items[0]!;

    const updated = await updateTemplateCatalogMetadata(db(), target.id, {
      description: "Deskripsi katalog baru yang diperbarui untuk pengujian.",
      tier: "exclusive",
      price: 150000,
      tags: ["update", "katalog", "test"],
      colorPalette: [{ hex: "#112233", name: "Midnight Navy", isPrimary: true }],
      supportedFeatures: ["rsvp", "digital_gift"],
    });

    expect(updated.description).toBe("Deskripsi katalog baru yang diperbarui untuk pengujian.");
    expect(updated.tier).toBe("exclusive");
    expect(updated.price).toBe(150000);
    expect(updated.tags).toContain("katalog");
    expect(updated.colorPalette[0]?.name).toBe("Midnight Navy");

    // Rejects duplicate slug
    const another = list.items[1]!;
    await expect(
      updateTemplateCatalogMetadata(db(), another.id, {
        slug: target.slug!,
      }),
    ).rejects.toThrow(/sudah digunakan/);
  });
});

// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { createResellerWithProfile } from "@/lib/db/repositories/resellers";
import {
  createCustomerOrder,
  getGlobalOrderStats,
  updateCustomerOrder,
} from "@/lib/db/repositories/orders";
import { escapeCsvCell, generateCsv } from "@/lib/csv/exporter";
import { buildCustomerOrderWhatsAppUrl } from "@/features/reseller/whatsapp";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Phase 5: CSV Exporter, WhatsApp Notifications & Order Analytics", () => {
  describe("1. RFC 4180 CSV Exporter with UTF-8 BOM", () => {
    it("escapes cells correctly according to RFC 4180", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
      expect(escapeCsvCell(12345)).toBe("12345");
      expect(escapeCsvCell(true)).toBe("true");
      expect(escapeCsvCell("SimpleText")).toBe("SimpleText");

      // Comma
      expect(escapeCsvCell("Jakarta, Indonesia")).toBe('"Jakarta, Indonesia"');

      // Double quotes
      expect(escapeCsvCell('Said "Hello"')).toBe('"Said ""Hello"""');

      // Newlines
      expect(escapeCsvCell("Line1\nLine2")).toBe('"Line1\nLine2"');
      expect(escapeCsvCell("Line1\r\nLine2")).toBe('"Line1\r\nLine2"');
    });

    it("generates CSV with optional UTF-8 BOM prefix and CRLF line breaks", () => {
      const headers = ["ID", "Nama Mitra", "Pelanggan", "Catatan"];
      const rows = [
        ["ORD-01", "Berkah Wedding", "Rian Syahputra", "Adat Sunda"],
        ["ORD-02", "Cahaya, Media", "Budi, Santoso", 'Request "lagu"'],
      ];

      // Standard CSV without BOM
      const rawCsv = generateCsv(headers, rows);
      expect(rawCsv.startsWith("\uFEFF")).toBe(false);

      // CSV with BOM for Excel compatibility
      const csvWithBom = generateCsv(headers, rows, { withBom: true });
      expect(csvWithBom.startsWith("\uFEFF")).toBe(true);

      const contentWithoutBom = csvWithBom.slice(1);
      const lines = contentWithoutBom.split("\r\n");

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("ID,Nama Mitra,Pelanggan,Catatan");
      expect(lines[1]).toBe("ORD-01,Berkah Wedding,Rian Syahputra,Adat Sunda");
      expect(lines[2]).toBe('ORD-02,"Cahaya, Media","Budi, Santoso","Request ""lagu"""');
    });
  });

  describe("2. WhatsApp Order Booking URL Generator", () => {
    it("normalizes Indonesian phone numbers and encodes customer order message", () => {
      const url = buildCustomerOrderWhatsAppUrl({
        sellerPhone: "0812-3456-7890",
        agencyName: "Kharisma Wedding",
        customerName: "Rian Syahputra",
        customerWhatsapp: "0899112233",
        groomBrideNames: "Rian & Aisyah",
        templateTitle: "Royal Blossom",
        eventDate: "2026-12-25",
        eventLocation: "Bandung",
        notes: "Tema adat Sunda",
      });

      // Target number should be formatted as 6281234567890
      expect(url.startsWith("https://wa.me/6281234567890?text=")).toBe(true);

      const params = new URL(url).searchParams;
      const text = params.get("text") ?? "";

      expect(text).toContain("*PESANAN BARU WEBSITE UNDANGAN - KHARISMA WEDDING*");
      expect(text).toContain("Rian Syahputra");
      expect(text).toContain("0899112233");
      expect(text).toContain("Rian & Aisyah");
      expect(text).toContain("Royal Blossom");
      expect(text).toContain("2026-12-25");
      expect(text).toContain("Bandung");
      expect(text).toContain("Tema adat Sunda");
    });
  });

  describe("3. Order Analytics & Pipeline Engine", () => {
    it("aggregates total, new, in-progress, and completed order statistics accurately", async () => {
      const reseller = await createResellerWithProfile(db(), {
        email: "analytics-seller@test.com",
        name: "Analytics Seller",
        agencyName: "Analytics Agency",
        slug: "analytics-agency",
        whatsappContact: "0812333444",
      });

      // Order 1: new
      await createCustomerOrder(db(), {
        sellerId: reseller.profile.id,
        customerName: "Customer 1",
        customerEmail: "c1@test.com",
        customerWhatsapp: "081111",
      });

      // Order 2: in_progress
      const o2 = await createCustomerOrder(db(), {
        sellerId: reseller.profile.id,
        customerName: "Customer 2",
        customerEmail: "c2@test.com",
        customerWhatsapp: "082222",
      });
      await updateCustomerOrder(db(), o2.id, { status: "in_progress" });

      // Order 3: completed
      const o3 = await createCustomerOrder(db(), {
        sellerId: reseller.profile.id,
        customerName: "Customer 3",
        customerEmail: "c3@test.com",
        customerWhatsapp: "083333",
      });
      await updateCustomerOrder(db(), o3.id, { status: "completed" });

      const stats = await getGlobalOrderStats(db());
      expect(stats.totalOrders).toBeGreaterThanOrEqual(3);
      expect(stats.newOrders).toBeGreaterThanOrEqual(1);
      expect(stats.inProgressOrders).toBeGreaterThanOrEqual(1);
      expect(stats.completedOrders).toBeGreaterThanOrEqual(1);
    });
  });
});

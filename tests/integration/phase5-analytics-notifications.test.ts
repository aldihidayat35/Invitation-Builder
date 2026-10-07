// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { makeUser } from "../helpers/world";
import { createResellerWithProfile } from "@/lib/db/repositories/resellers";
import { createBankAccount } from "@/lib/db/repositories/bank-accounts";
import {
  createTopupRequest,
  approveTopupRequest,
  rejectTopupRequest,
  getTopupFinancialRecap,
} from "@/lib/db/repositories/topup-requests";
import { getAdminTopupFinancialRecap } from "@/features/admin/api";
import { escapeCsvCell, generateCsv } from "@/lib/csv/exporter";
import { buildWhatsAppConfirmationUrl } from "@/features/reseller/whatsapp";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Phase 5: Optimasi Notifikasi & Analitik Rekapitulasi Manual", () => {
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
      const headers = ["ID", "Nama Mitra", "Nominal", "Catatan"];
      const rows = [
        ["REQ-01", "Berkah Wedding", 500000, "Transfer BCA"],
        ["REQ-02", "Cahaya, Media", 1000000, 'Struk "valid"'],
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
      expect(lines[0]).toBe("ID,Nama Mitra,Nominal,Catatan");
      expect(lines[1]).toBe("REQ-01,Berkah Wedding,500000,Transfer BCA");
      expect(lines[2]).toBe('REQ-02,"Cahaya, Media",1000000,"Struk ""valid"""');
    });
  });

  describe("2. WhatsApp Confirmation URL Generator", () => {
    it("normalizes Indonesian phone numbers and encodes confirmation message", () => {
      const url = buildWhatsAppConfirmationUrl({
        ownerPhone: "0812-3456-7890",
        agencyName: "Kharisma Wedding",
        amountPaid: 750000,
        creditAmount: 75,
        senderBank: "BCA",
        senderAccountName: "Budi Santoso",
        transferDate: "2026-10-07",
      });

      // Target number should be formatted as 6281234567890
      expect(url.startsWith("https://wa.me/6281234567890?text=")).toBe(true);

      const params = new URL(url).searchParams;
      const text = params.get("text") ?? "";

      expect(text).toContain("*KONFIRMASI TOP-UP SALDO RESELLER*");
      expect(text).toContain("Kharisma Wedding");
      expect(text).toContain("750.000");
      expect(text).toContain("75 Kredit");
      expect(text).toContain("BCA");
      expect(text).toContain("Budi Santoso");
      expect(text).toContain("2026-10-07");
    });

    it("handles international format phone numbers starting with +62", () => {
      const url = buildWhatsAppConfirmationUrl({
        ownerPhone: "+62 856-7890-1234",
        agencyName: "Indah Organizer",
        amountPaid: 1000000,
        creditAmount: 100,
        senderBank: "Mandiri",
        senderAccountName: "Siti Rahma",
      });

      expect(url.startsWith("https://wa.me/6285678901234?text=")).toBe(true);
    });
  });

  describe("3. Financial Recap & Analytics Engine", () => {
    it("aggregates revenue, credit counts, and status breakdowns accurately", async () => {
      // 1. Setup Owner and Bank Account
      const ownerUser = await makeUser(db(), "phase5-owner");
      const bank = await createBankAccount(db(), {
        bankName: "BCA",
        accountNumber: "8881234567",
        accountHolder: "PT Digital Undangan",
      });

      // 2. Setup Resellers
      const r1 = await createResellerWithProfile(db(), {
        email: "reseller1@phase5.com",
        name: "Reseller One",
        agencyName: "Agency Satu",
        slug: "agency-satu-p5",
        whatsappContact: "0811111111",
        initialCredits: 0,
      });

      const r2 = await createResellerWithProfile(db(), {
        email: "reseller2@phase5.com",
        name: "Reseller Two",
        agencyName: "Agency Dua",
        slug: "agency-dua-p5",
        whatsappContact: "0822222222",
        initialCredits: 0,
      });

      // 3. Create requests
      // Request 1: Pending (Rp 500.000, 50 credits)
      await createTopupRequest(db(), {
        resellerId: r1.profile.id,
        bankAccountId: bank.id,
        amountPaid: 500000,
        creditAmount: 50,
        senderBank: "BCA",
        senderAccountName: "Pengirim 1",
        proofFileUrl: "/uploads/proof1.png",
      });

      // Request 2: Approved (Rp 1.000.000, 100 credits)
      const req2 = await createTopupRequest(db(), {
        resellerId: r1.profile.id,
        bankAccountId: bank.id,
        amountPaid: 1000000,
        creditAmount: 100,
        senderBank: "BRI",
        senderAccountName: "Pengirim 1",
        proofFileUrl: "/uploads/proof2.png",
      });
      await approveTopupRequest(db(), {
        requestId: req2.id,
        reviewedBy: ownerUser.id,
      });

      // Request 3: Rejected (Rp 200.000, 20 credits)
      const req3 = await createTopupRequest(db(), {
        resellerId: r2.profile.id,
        bankAccountId: bank.id,
        amountPaid: 200000,
        creditAmount: 20,
        senderBank: "BSI",
        senderAccountName: "Pengirim 2",
        proofFileUrl: "/uploads/proof3.png",
      });
      await rejectTopupRequest(db(), {
        requestId: req3.id,
        reviewedBy: ownerUser.id,
        rejectionReason: "Bukti transfer buram",
      });

      // Request 4: Approved (Rp 1.500.000, 150 credits)
      const req4 = await createTopupRequest(db(), {
        resellerId: r2.profile.id,
        bankAccountId: bank.id,
        amountPaid: 1500000,
        creditAmount: 150,
        senderBank: "Mandiri",
        senderAccountName: "Pengirim 2",
        proofFileUrl: "/uploads/proof4.png",
      });
      await approveTopupRequest(db(), {
        requestId: req4.id,
        reviewedBy: ownerUser.id,
      });

      // 4. Calculate Financial Recap directly from Repository
      const repoRecap = await getTopupFinancialRecap(db());

      expect(repoRecap.totalRequestsCount).toBe(4);
      expect(repoRecap.totalPendingCount).toBe(1);
      expect(repoRecap.totalApprovedCount).toBe(2);
      expect(repoRecap.totalRejectedCount).toBe(1);

      // Revenue: Approved = 1.000.000 + 1.500.000 = 2.500.000
      expect(repoRecap.totalApprovedRevenue).toBe(2500000);

      // Revenue: Pending = 500.000
      expect(repoRecap.totalPendingRevenue).toBe(500000);

      // Credits: Approved = 100 + 150 = 250
      expect(repoRecap.totalApprovedCredits).toBe(250);

      // 5. Test getAdminTopupFinancialRecap from Feature Layer
      const adminRecap = await getAdminTopupFinancialRecap(db());
      expect(adminRecap).toEqual(repoRecap);
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  BANK_VERIFICATION_KEY,
  extractBankAccountsFromRecord,
  getBankVerificationMeta,
  isGiftAccountVariableKey,
} from "@/lib/engine/bank-lock";

describe("Bank Account Security & Locking (bank-lock)", () => {
  describe("isGiftAccountVariableKey", () => {
    it("should identify various gift & bank variable keys as locked bank fields", () => {
      const bankKeys = [
        "gift.bank",
        "gift.accountNumber",
        "gift.accountName",
        "gift.bank2",
        "gift.accountNumber2",
        "gift.accountName2",
        "gift.rekening_1",
        "amplop.bank",
        "amplop.nomor_rekening",
        "rekening.bank_utama",
        "digital_gift.bank",
        "gift_bank_name",
        "amplop_digital_nama_bank",
      ];

      for (const key of bankKeys) {
        expect(isGiftAccountVariableKey(key)).toBe(true);
      }
    });

    it("should not match regular event, bride, or couple fields", () => {
      const normalKeys = [
        "bride.name",
        "groom.name",
        "couple.story",
        "event.date",
        "akad.location",
        "resepsi.address",
        "quote.text",
        "gallery.image1",
      ];

      for (const key of normalKeys) {
        expect(isGiftAccountVariableKey(key)).toBe(false);
      }
    });
  });

  describe("extractBankAccountsFromRecord", () => {
    it("should correctly extract primary and secondary bank account info", () => {
      const raw = {
        "gift.bank": "BCA",
        "gift.accountNumber": "1234567890",
        "gift.accountName": "Budi Santoso",
        "gift.bank2": "Mandiri",
        "gift.accountNumber2": "9876543210",
        "gift.accountName2": "Siti Rahma",
      };

      const extracted = extractBankAccountsFromRecord(raw);
      expect(extracted.primary).toEqual({
        bank: "BCA",
        accountNumber: "1234567890",
        accountName: "Budi Santoso",
      });
      expect(extracted.secondary).toEqual({
        bank: "Mandiri",
        accountNumber: "9876543210",
        accountName: "Siti Rahma",
      });
    });

    it("should return null for primary when no bank fields are present", () => {
      const raw = {
        "bride.name": "Siti",
        "groom.name": "Budi",
      };

      const extracted = extractBankAccountsFromRecord(raw);
      expect(extracted.primary).toBeNull();
      expect(extracted.secondary).toBeNull();
    });
  });

  describe("getBankVerificationMeta", () => {
    it("should return unconfigured status when no meta is stored", () => {
      const meta = getBankVerificationMeta({});
      expect(meta.status).toBe("unconfigured");
      expect(meta.verifiedPrimary).toBeUndefined();
      expect(meta.proposedPrimary).toBeUndefined();
    });

    it("should parse existing valid meta correctly", () => {
      const data = {
        [BANK_VERIFICATION_KEY]: {
          status: "verified",
          verifiedPrimary: {
            bank: "BCA",
            accountNumber: "1234567890",
            accountName: "Budi Santoso",
          },
          verifiedAt: "2026-10-13T10:00:00.000Z",
          verifiedBy: "admin-1",
        },
      };

      const meta = getBankVerificationMeta(data);
      expect(meta.status).toBe("verified");
      expect(meta.verifiedPrimary?.bank).toBe("BCA");
      expect(meta.verifiedBy).toBe("admin-1");
    });
  });
});

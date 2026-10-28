// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../../helpers/db";
import {
  DEFAULT_MASTER_BANKS,
  ensureMasterBanksTable,
  listMasterBanks,
  findMasterBankById,
  findMasterBankByCode,
  createMasterBank,
  updateMasterBank,
  deleteMasterBank,
  toggleMasterBankStatus,
  resetMasterBanksToDefault,
} from "@/lib/db/repositories/master-banks";
import {
  resolveFallbackBankLogo,
  MASTER_BANKS_DEFAULT,
  extractBankAccountsFromRecord,
} from "@/lib/engine/bank-lock";

describe("Master Banks & Logo Fallbacks", () => {
  describe("Default Bank Definitions & Fallback Resolver", () => {
    it("should have all 16 requested default banks and e-wallets", () => {
      const expectedCodes = [
        "bca",
        "mandiri",
        "bri",
        "bni",
        "bsi",
        "cimb",
        "permata",
        "jago",
        "seabank",
        "blu",
        "dana",
        "gopay",
        "ovo",
        "shopeepay",
        "linkaja",
        "qris",
      ];

      expect(DEFAULT_MASTER_BANKS).toHaveLength(16);
      expect(MASTER_BANKS_DEFAULT).toHaveLength(16);

      for (const code of expectedCodes) {
        const found = DEFAULT_MASTER_BANKS.find((b) => b.code === code);
        expect(found, `Expected ${code} to exist in DEFAULT_MASTER_BANKS`).toBeDefined();
        expect(found?.logoUrl).toMatch(new RegExp(`/images/banks/${code}\\.svg$`));
      }
    });

    it("should correctly resolve fallback logos by exact name and aliases", () => {
      // Direct names
      expect(resolveFallbackBankLogo("BCA")).toBe("/images/banks/bca.svg");
      expect(resolveFallbackBankLogo("Bank Mandiri")).toBe("/images/banks/mandiri.svg");
      expect(resolveFallbackBankLogo("Mandiri")).toBe("/images/banks/mandiri.svg");
      expect(resolveFallbackBankLogo("BRI")).toBe("/images/banks/bri.svg");
      expect(resolveFallbackBankLogo("Bank Rakyat Indonesia")).toBe("/images/banks/bri.svg");
      expect(resolveFallbackBankLogo("BNI")).toBe("/images/banks/bni.svg");
      expect(resolveFallbackBankLogo("BSI")).toBe("/images/banks/bsi.svg");
      expect(resolveFallbackBankLogo("Bank Syariah Indonesia")).toBe("/images/banks/bsi.svg");
      expect(resolveFallbackBankLogo("CIMB Niaga")).toBe("/images/banks/cimb.svg");
      expect(resolveFallbackBankLogo("Permata")).toBe("/images/banks/permata.svg");
      expect(resolveFallbackBankLogo("Bank Jago")).toBe("/images/banks/jago.svg");
      expect(resolveFallbackBankLogo("SeaBank")).toBe("/images/banks/seabank.svg");
      expect(resolveFallbackBankLogo("Blu by BCA")).toBe("/images/banks/blu.svg");
      expect(resolveFallbackBankLogo("DANA")).toBe("/images/banks/dana.svg");
      expect(resolveFallbackBankLogo("GoPay")).toBe("/images/banks/gopay.svg");
      expect(resolveFallbackBankLogo("OVO")).toBe("/images/banks/ovo.svg");
      expect(resolveFallbackBankLogo("ShopeePay")).toBe("/images/banks/shopeepay.svg");
      expect(resolveFallbackBankLogo("LinkAja")).toBe("/images/banks/linkaja.svg");
      expect(resolveFallbackBankLogo("QRIS")).toBe("/images/banks/qris.svg");
    });

    it("should fallback to generic SVG logo for unknown bank names", () => {
      expect(resolveFallbackBankLogo("Bank Antartika")).toBe("/images/banks/generic.svg");
      expect(resolveFallbackBankLogo("")).toBe("/images/banks/generic.svg");
      expect(resolveFallbackBankLogo(null)).toBe("/images/banks/generic.svg");
      expect(resolveFallbackBankLogo(undefined)).toBe("/images/banks/generic.svg");
    });

    it("extractBankAccountsFromRecord extracts bankLogo when present and omits when absent", () => {
      const withLogo = {
        "gift.bank": "BCA",
        "gift.accountNumber": "12345",
        "gift.accountName": "John Doe",
        "gift.bankLogo": "/images/banks/bca.svg",
        "gift.bank2": "GoPay",
        "gift.accountNumber2": "08123456789",
        "gift.accountName2": "John Doe",
        "gift.bankLogo2": "/images/banks/gopay.svg",
      };

      const extracted = extractBankAccountsFromRecord(withLogo);
      expect(extracted.primary).toEqual({
        bank: "BCA",
        accountNumber: "12345",
        accountName: "John Doe",
        bankLogo: "/images/banks/bca.svg",
      });
      expect(extracted.secondary).toEqual({
        bank: "GoPay",
        accountNumber: "08123456789",
        accountName: "John Doe",
        bankLogo: "/images/banks/gopay.svg",
      });

      const withoutLogo = {
        "gift.bank": "BRI",
        "gift.accountNumber": "98765",
        "gift.accountName": "Jane Doe",
      };
      const extractedWithout = extractBankAccountsFromRecord(withoutLogo);
      expect(extractedWithout.primary).toEqual({
        bank: "BRI",
        accountNumber: "98765",
        accountName: "Jane Doe",
      });
      expect(extractedWithout.primary?.bankLogo).toBeUndefined();
    });
  });

  describe("Master Banks Repository Operations", () => {
    type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
    let conn: Conn;

    beforeAll(async () => {
      conn = await createMigratedDb();
    });

    afterAll(async () => {
      await conn.close();
    });

    it("ensureMasterBanksTable creates table and seeds 16 default records", async () => {
      await ensureMasterBanksTable(conn.db);
      const list = await listMasterBanks(conn.db);
      expect(list.length).toBe(16);
      expect(list[0]?.code).toBe("bca");
    });

    it("can create a new master bank and find it by code", async () => {
      const newBank = await createMasterBank(conn.db, {
        code: "bank-dki",
        name: "Bank DKI",
        category: "bank",
        logoUrl: "/images/banks/custom-dki.svg",
        isActive: true,
        sortOrder: 50,
      });

      expect(newBank.code).toBe("bank-dki");
      expect(newBank.name).toBe("Bank DKI");

      const found = await findMasterBankByCode(conn.db, "bank-dki");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Bank DKI");
    });

    it("can update an existing master bank", async () => {
      const found = await findMasterBankByCode(conn.db, "bank-dki");
      expect(found).toBeDefined();

      const updated = await updateMasterBank(conn.db, found!.id, {
        name: "Bank DKI Syariah",
        logoUrl: "/images/banks/dki-syariah.svg",
      });

      expect(updated.name).toBe("Bank DKI Syariah");
      expect(updated.logoUrl).toBe("/images/banks/dki-syariah.svg");
    });

    it("can toggle active status", async () => {
      const found = await findMasterBankByCode(conn.db, "bank-dki");
      expect(found).toBeDefined();

      const toggled = await toggleMasterBankStatus(conn.db, found!.id, false);
      expect(toggled.isActive).toBe(false);

      const activeOnly = await listMasterBanks(conn.db, { activeOnly: true });
      expect(activeOnly.some((b) => b.code === "bank-dki")).toBe(false);
    });

    it("can delete a bank", async () => {
      const found = await findMasterBankByCode(conn.db, "bank-dki");
      expect(found).toBeDefined();

      const deleted = await deleteMasterBank(conn.db, found!.id);
      expect(deleted).toBe(true);

      const check = await findMasterBankById(conn.db, found!.id);
      expect(check).toBeUndefined();
    });

    it("can reset master banks back to the 16 defaults", async () => {
      const resetList = await resetMasterBanksToDefault(conn.db);
      expect(resetList.length).toBe(16);
      expect(resetList.map((b) => b.code)).toContain("bca");
      expect(resetList.map((b) => b.code)).toContain("qris");
    });
  });
});

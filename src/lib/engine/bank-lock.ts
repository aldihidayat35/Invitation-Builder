/**
 * Bank Account / Digital Envelope (Amplop Digital) Variable Security & Verification System.
 * 
 * Rules:
 * - Variabel rekening (gift.bank, gift.accountNumber, gift.accountName, dst.) DILINDUNGI.
 * - Klien hanya dapat mengajukan usulan (proposed) yang berstatus "pending_review".
 * - Seller (non-admin) tidak dapat mengubah variabel rekening resmi.
 * - Hanya Super Admin (owner) yang dapat memverifikasi dan menyuntikkan rekening resmi ke undangan live.
 */

export interface BankAccountDetails {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export interface BankVerificationMeta {
  status: "unconfigured" | "pending_review" | "verified";
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedPrimary?: BankAccountDetails | null;
  verifiedSecondary?: BankAccountDetails | null;
  proposedPrimary?: BankAccountDetails | null;
  proposedSecondary?: BankAccountDetails | null;
  proposedAt?: string | null;
  clientNote?: string | null;
  adminNote?: string | null;
}

export const BANK_VERIFICATION_KEY = "_bankVerification";

/**
 * Memeriksa apakah sebuah variable key termasuk dalam kategori rekening / hadiah / amplop digital.
 */
export function isGiftAccountVariableKey(key: string): boolean {
  const normalized = key.toLowerCase().trim();
  if (
    normalized.startsWith("gift.") ||
    normalized.startsWith("gift_") ||
    normalized.startsWith("rekening.") ||
    normalized.startsWith("rekening_") ||
    normalized.startsWith("bank.") ||
    normalized.startsWith("bank_") ||
    normalized.startsWith("amplop.") ||
    normalized.startsWith("amplop_") ||
    normalized.startsWith("digital_gift.") ||
    normalized.startsWith("digital_gift_")
  ) {
    return true;
  }
  if (
    normalized.includes("rekening") ||
    normalized.includes("account_number") ||
    normalized.includes("accountnumber") ||
    normalized.includes("account_holder") ||
    normalized.includes("account_name") ||
    normalized.includes("bank_name") ||
    normalized.includes("nomor_rekening") ||
    normalized.includes("nomorrekening") ||
    normalized.includes("nama_rekening")
  ) {
    return true;
  }
  return false;
}

/**
 * Membaca metadata verifikasi rekening dari objek data undangan (invitation.data).
 */
export function getBankVerificationMeta(
  data: Record<string, unknown> | null | undefined,
): BankVerificationMeta {
  if (!data) {
    return { status: "unconfigured" };
  }

  const raw = data[BANK_VERIFICATION_KEY];
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const status =
      obj.status === "verified" || obj.status === "pending_review"
        ? (obj.status as "verified" | "pending_review")
        : "unconfigured";

    return {
      status,
      verifiedAt: typeof obj.verifiedAt === "string" ? obj.verifiedAt : null,
      verifiedBy: typeof obj.verifiedBy === "string" ? obj.verifiedBy : null,
      verifiedPrimary: (obj.verifiedPrimary as BankAccountDetails) || null,
      verifiedSecondary: (obj.verifiedSecondary as BankAccountDetails) || null,
      proposedPrimary: (obj.proposedPrimary as BankAccountDetails) || null,
      proposedSecondary: (obj.proposedSecondary as BankAccountDetails) || null,
      proposedAt: typeof obj.proposedAt === "string" ? obj.proposedAt : null,
      clientNote: typeof obj.clientNote === "string" ? obj.clientNote : null,
      adminNote: typeof obj.adminNote === "string" ? obj.adminNote : null,
    };
  }

  // Fallback: Jika belum ada _bankVerification tetapi data gift sudah ada di invitation.data
  const hasExistingPrimary =
    Boolean(data["gift.bank"] || data["gift.bank_name"]) &&
    Boolean(data["gift.accountNumber"] || data["gift.account_number"]);

  if (hasExistingPrimary) {
    return {
      status: "verified",
      verifiedPrimary: {
        bank: String(data["gift.bank"] || data["gift.bank_name"] || ""),
        accountNumber: String(data["gift.accountNumber"] || data["gift.account_number"] || ""),
        accountName: String(
          data["gift.accountName"] || data["gift.account_holder"] || data["gift.account_name"] || "",
        ),
      },
      verifiedSecondary:
        data["gift.bank2"] || data["gift.accountNumber2"]
          ? {
              bank: String(data["gift.bank2"] || ""),
              accountNumber: String(data["gift.accountNumber2"] || ""),
              accountName: String(data["gift.accountName2"] || ""),
            }
          : null,
    };
  }

  return { status: "unconfigured" };
}

/**
 * Mengekstrak nilai rekening primary & secondary dari pasangan key-value submission.
 */
export function extractBankAccountsFromRecord(
  values: Record<string, unknown> | Record<string, string>,
): {
  primary: BankAccountDetails | null;
  secondary: BankAccountDetails | null;
} {
  const getStr = (keys: string[]): string => {
    for (const k of keys) {
      const val = values[k];
      if (typeof val === "string" && val.trim() !== "") {
        return val.trim();
      }
    }
    return "";
  };

  const bank1 = getStr(["gift.bank", "gift.bank_name", "bank", "nama_bank"]);
  const num1 = getStr(["gift.accountNumber", "gift.account_number", "rekening", "nomor_rekening"]);
  const name1 = getStr([
    "gift.accountName",
    "gift.account_holder",
    "gift.account_name",
    "atas_nama_rekening",
    "nama_rekening",
  ]);

  const bank2 = getStr(["gift.bank2", "gift.bank_name2", "bank2"]);
  const num2 = getStr(["gift.accountNumber2", "gift.account_number2", "rekening2", "nomor_rekening2"]);
  const name2 = getStr(["gift.accountName2", "gift.account_holder2", "gift.account_name2", "atas_nama2"]);

  const primary = bank1 || num1 || name1 ? { bank: bank1, accountNumber: num1, accountName: name1 } : null;
  const secondary = bank2 || num2 || name2 ? { bank: bank2, accountNumber: num2, accountName: name2 } : null;

  return { primary, secondary };
}

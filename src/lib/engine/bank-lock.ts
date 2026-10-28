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
  bankLogo?: string | null;
}

export interface MasterBankItem {
  readonly code: string;
  readonly name: string;
  readonly category?: string;
  readonly logoUrl: string;
}

export const MASTER_BANKS_DEFAULT: readonly MasterBankItem[] = [
  { code: "bca", name: "BCA", category: "bank", logoUrl: "/images/banks/bca.svg" },
  { code: "mandiri", name: "Bank Mandiri", category: "bank", logoUrl: "/images/banks/mandiri.svg" },
  { code: "bri", name: "BRI", category: "bank", logoUrl: "/images/banks/bri.svg" },
  { code: "bni", name: "BNI", category: "bank", logoUrl: "/images/banks/bni.svg" },
  { code: "bsi", name: "BSI", category: "bank", logoUrl: "/images/banks/bsi.svg" },
  { code: "cimb", name: "CIMB Niaga", category: "bank", logoUrl: "/images/banks/cimb.svg" },
  { code: "permata", name: "Bank Permata", category: "bank", logoUrl: "/images/banks/permata.svg" },
  { code: "jago", name: "Bank Jago", category: "bank", logoUrl: "/images/banks/jago.svg" },
  { code: "seabank", name: "SeaBank", category: "bank", logoUrl: "/images/banks/seabank.svg" },
  { code: "blu", name: "Blu by BCA Digital", category: "bank", logoUrl: "/images/banks/blu.svg" },
  { code: "dana", name: "DANA", category: "ewallet", logoUrl: "/images/banks/dana.svg" },
  { code: "gopay", name: "GoPay", category: "ewallet", logoUrl: "/images/banks/gopay.svg" },
  { code: "ovo", name: "OVO", category: "ewallet", logoUrl: "/images/banks/ovo.svg" },
  { code: "shopeepay", name: "ShopeePay", category: "ewallet", logoUrl: "/images/banks/shopeepay.svg" },
  { code: "linkaja", name: "LinkAja", category: "ewallet", logoUrl: "/images/banks/linkaja.svg" },
  { code: "qris", name: "QRIS", category: "qris", logoUrl: "/images/banks/qris.svg" },
] as const;

/**
 * Resolves a fallback SVG logo path based on bank / e-wallet name for backward compatibility.
 */
export function resolveFallbackBankLogo(
  bankName?: string | null,
  customLogo?: string | null,
): string {
  if (typeof customLogo === "string" && customLogo.trim() !== "") {
    return customLogo.trim();
  }
  if (!bankName || typeof bankName !== "string" || bankName.trim() === "") {
    return "/images/banks/generic.svg";
  }

  const clean = bankName.toLowerCase().trim();
  const normalized = clean.replace(/[^a-z0-9]/g, "");

  // Match order is prioritized to prevent partial substring collisions (e.g. cimbniaga vs bni)
  if (normalized.includes("blu")) return "/images/banks/blu.svg";
  if (normalized.includes("cimb") || normalized.includes("niaga")) return "/images/banks/cimb.svg";
  if (normalized.includes("bca") || normalized.includes("centralasia")) return "/images/banks/bca.svg";
  if (normalized.includes("mandiri") || normalized.includes("livin")) return "/images/banks/mandiri.svg";
  if (
    normalized.includes("bri") ||
    normalized.includes("rakyatindonesia") ||
    normalized.includes("brimo")
  ) {
    return "/images/banks/bri.svg";
  }
  if (
    /\bbni\b/i.test(clean) ||
    normalized.includes("negaraindonesia") ||
    normalized === "bni"
  ) {
    return "/images/banks/bni.svg";
  }
  if (
    /\bbsi\b/i.test(clean) ||
    normalized.includes("syariahindonesia") ||
    normalized.includes("syariah") ||
    normalized === "bsi"
  ) {
    return "/images/banks/bsi.svg";
  }
  if (normalized.includes("permata")) return "/images/banks/permata.svg";
  if (normalized.includes("jago")) return "/images/banks/jago.svg";
  if (normalized.includes("seabank") || /\bsea\b/i.test(clean)) return "/images/banks/seabank.svg";
  if (normalized.includes("dana")) return "/images/banks/dana.svg";
  if (normalized.includes("gopay") || normalized.includes("gojek")) return "/images/banks/gopay.svg";
  if (normalized.includes("ovo")) return "/images/banks/ovo.svg";
  if (normalized.includes("shopee") || normalized.includes("spay")) return "/images/banks/shopeepay.svg";
  if (
    normalized.includes("linkaja") ||
    normalized.includes("tcash") ||
    /\blink\b/i.test(clean)
  ) {
    return "/images/banks/linkaja.svg";
  }
  if (normalized.includes("qris") || /\bqr\b/i.test(clean)) return "/images/banks/qris.svg";

  return "/images/banks/generic.svg";
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
    normalized.includes("nama_rekening") ||
    normalized === "bank" ||
    normalized === "bank2" ||
    normalized === "banklogo" ||
    normalized === "banklogo2" ||
    normalized.includes("bank_logo") ||
    normalized.includes("banklogo")
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

  const logo1 = getStr(["gift.bankLogo", "gift.bank_logo", "gift.logo", "bankLogo", "logo"]);
  const logo2 = getStr(["gift.bankLogo2", "gift.bank_logo2", "gift.logo2", "bankLogo2", "logo2"]);

  const primary =
    bank1 || num1 || name1
      ? {
          bank: bank1,
          accountNumber: num1,
          accountName: name1,
          ...(logo1 ? { bankLogo: logo1 } : {}),
        }
      : null;
  const secondary =
    bank2 || num2 || name2
      ? {
          bank: bank2,
          accountNumber: num2,
          accountName: name2,
          ...(logo2 ? { bankLogo: logo2 } : {}),
        }
      : null;

  return { primary, secondary };
}

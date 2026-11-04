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

/**
 * Fuzzy matches an input bank/e-wallet name against the active master banks list.
 */
export function findMatchingMasterBank<T extends { code: string; name: string }>(
  availableBanks: readonly T[],
  input?: string | null,
): T | undefined {
  if (!input || !input.trim()) return undefined;
  const raw = input.trim().toLowerCase();
  // Remove common Indonesian business/banking prefixes and suffixes
  let cleaned = raw
    .replace(/^(pt|pt\.|cv|cv\.)\s+/gi, "")
    .trim();
  cleaned = cleaned
    .replace(/^bank\s+/gi, "")
    .replace(/\s+bank$/gi, "")
    .replace(/\s+(tbk|tbk\.)$/gi, "")
    .trim();

  // 1. Direct code or name match
  let found = availableBanks.find(
    (b) => b.code.toLowerCase() === raw || b.name.toLowerCase() === raw,
  );
  if (found) return found;

  // 2. Cleaned name or code match
  found = availableBanks.find(
    (b) =>
      b.code.toLowerCase() === cleaned ||
      b.name.toLowerCase() === cleaned ||
      b.name.toLowerCase().replace(/^bank\s+/gi, "").trim() === cleaned,
  );
  if (found) return found;

  // 3. Known aliases and abbreviations
  if (cleaned.includes("central asia") || raw.includes("bca") || cleaned === "bca") {
    return availableBanks.find((b) => b.code === "bca");
  }
  if (cleaned.includes("mandiri") || raw.includes("livin")) {
    return availableBanks.find((b) => b.code === "mandiri");
  }
  if (cleaned.includes("rakyat indonesia") || raw.includes("bri") || raw.includes("brimo")) {
    return availableBanks.find((b) => b.code === "bri");
  }
  if (cleaned.includes("negara indonesia") || /\bbni\b/i.test(raw)) {
    return availableBanks.find((b) => b.code === "bni");
  }
  if (cleaned.includes("syariah indonesia") || /\bbsi\b/i.test(raw) || raw.includes("syariah")) {
    return availableBanks.find((b) => b.code === "bsi");
  }
  if (cleaned.includes("cimb") || cleaned.includes("niaga")) {
    return availableBanks.find((b) => b.code === "cimb");
  }
  if (cleaned.includes("permata")) {
    return availableBanks.find((b) => b.code === "permata");
  }
  if (cleaned.includes("jago")) {
    return availableBanks.find((b) => b.code === "jago");
  }
  if (cleaned.includes("sea") || cleaned.includes("seabank")) {
    return availableBanks.find((b) => b.code === "seabank");
  }
  if (cleaned.includes("blu")) {
    return availableBanks.find((b) => b.code === "blu");
  }
  if (cleaned.includes("dana")) {
    return availableBanks.find((b) => b.code === "dana");
  }
  if (cleaned.includes("gopay") || raw.includes("gojek")) {
    return availableBanks.find((b) => b.code === "gopay");
  }
  if (cleaned.includes("ovo")) {
    return availableBanks.find((b) => b.code === "ovo");
  }
  if (cleaned.includes("shopeepay") || cleaned.includes("shopee") || raw.includes("spay")) {
    return availableBanks.find((b) => b.code === "shopeepay");
  }
  if (
    cleaned.includes("linkaja") ||
    raw.includes("tcash") ||
    /\blink\b/i.test(raw)
  ) {
    return availableBanks.find((b) => b.code === "linkaja");
  }
  if (cleaned.includes("qris") || /\bqr\b/i.test(raw)) {
    return availableBanks.find((b) => b.code === "qris");
  }

  return undefined;
}

const STOCK_DEFAULT_LOGOS = new Set<string>(
  MASTER_BANKS_DEFAULT.map((b) => b.logoUrl).concat(["/images/banks/generic.svg"]),
);

export function isStockBankLogo(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed.includes("generic.svg")) return true;
  return (
    STOCK_DEFAULT_LOGOS.has(trimmed) ||
    (trimmed.startsWith("/images/banks/") && trimmed.endsWith(".svg"))
  );
}

/**
 * Resolves bank/e-wallet logo dynamically from active Master Banks.
 *
 * Rules:
 * 1. If bankName matches a master bank, it follows the master bank's logo.
 *    - If master bank has an updated logo from admin, it is used immediately.
 *    - If currentLogo is stock default, it uses the master bank logo.
 * 2. If currentLogo is an explicit custom external URL (e.g. https://... or custom upload), it is preserved.
 * 3. Never returns generic.svg if bankName can be resolved.
 */
export function resolveDynamicBankLogo(
  bankName?: string | null,
  currentLogo?: string | null,
  masterBanks?: readonly MasterBankItem[],
): string {
  const banks = masterBanks && masterBanks.length > 0 ? masterBanks : MASTER_BANKS_DEFAULT;

  const isGeneric = (url?: string | null) =>
    !url ||
    url.trim() === "" ||
    url.includes("generic.svg") ||
    url.endsWith("/generic.svg");

  const trimmedLogo = typeof currentLogo === "string" ? currentLogo.trim() : "";

  if (bankName && bankName.trim()) {
    const matched = findMatchingMasterBank(banks, bankName);
    if (matched && matched.logoUrl && !isGeneric(matched.logoUrl)) {
      const masterIsCustom = !isStockBankLogo(matched.logoUrl);
      const currentIsStock = isStockBankLogo(trimmedLogo);

      if (masterIsCustom || currentIsStock) {
        return matched.logoUrl;
      }

      if (trimmedLogo && !isGeneric(trimmedLogo)) {
        return trimmedLogo;
      }

      return matched.logoUrl;
    }
  }

  if (trimmedLogo && !isGeneric(trimmedLogo)) {
    return trimmedLogo;
  }

  if (bankName && bankName.trim()) {
    return resolveFallbackBankLogo(bankName);
  }

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

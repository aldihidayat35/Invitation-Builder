"use client";

import { useState } from "react";
import { copyTextToClipboard } from "@/lib/browser/clipboard";
import { resolveFallbackBankLogo } from "@/lib/engine/bank-lock";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import { CheckIcon, CopyIcon, QrIcon } from "./WidgetIcons";

export interface GiftWidgetProps {
  readonly title?: unknown;
  readonly accounts?: unknown;
  readonly bank?: unknown;
  readonly accountNumber?: unknown;
  readonly accountName?: unknown;
  readonly bankLogo?: unknown;
  readonly bank2?: unknown;
  readonly accountNumber2?: unknown;
  readonly accountName2?: unknown;
  readonly bankLogo2?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

export interface GiftExtraProps {
  readonly bank?: unknown;
  readonly accountNumber?: unknown;
  readonly accountName?: unknown;
  readonly bankLogo?: unknown;
  readonly bank2?: unknown;
  readonly accountNumber2?: unknown;
  readonly accountName2?: unknown;
  readonly bankLogo2?: unknown;
}

export interface GiftAccount {
  readonly bank: string;
  readonly accountNumber: string;
  readonly accountName: string;
  readonly bankLogo?: string;
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Picks only known fields from bound collection items or individual auto-variables. */
export function parseGiftAccounts(accounts: unknown, extraProps?: GiftExtraProps): GiftAccount[] {
  const out: GiftAccount[] = [];

  // 1. Cek rekening utama dari variabel auto-binding
  const mainAccNo = s(extraProps?.accountNumber);
  if (mainAccNo) {
    const bankName = s(extraProps?.bank) || "BCA";
    const logo = s(extraProps?.bankLogo) || resolveFallbackBankLogo(bankName);
    out.push({
      bank: bankName,
      accountNumber: mainAccNo,
      accountName: s(extraProps?.accountName) || "Nama Mempelai",
      bankLogo: logo,
    });
  }

  // 2. Cek rekening kedua (opsional)
  const secAccNo = s(extraProps?.accountNumber2);
  if (secAccNo) {
    const bankName2 = s(extraProps?.bank2) || "Mandiri";
    const logo2 = s(extraProps?.bankLogo2) || resolveFallbackBankLogo(bankName2);
    out.push({
      bank: bankName2,
      accountNumber: secAccNo,
      accountName: s(extraProps?.accountName2) || "Nama Mempelai",
      bankLogo: logo2,
    });
  }

  // 3. Cek array accounts (collection)
  if (Array.isArray(accounts)) {
    for (const raw of accounts) {
      if (typeof raw !== "object" || raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const accountNumber = s(rec.accountNumber);
      if (!accountNumber) continue;
      if (!out.some((a) => a.accountNumber === accountNumber)) {
        const b = s(rec.bank);
        const l = s(rec.bankLogo || rec.logoUrl || rec.logo) || resolveFallbackBankLogo(b);
        out.push({
          bank: b,
          accountNumber,
          accountName: s(rec.accountName),
          bankLogo: l,
        });
      }
    }
  }

  // Maksimal 2 rekening sesuai standar
  return out.slice(0, 2);
}

/** Bank/e-wallet list with copy-to-clipboard and visible/announced feedback (FR-WDG-008). */
export function GiftWidget({
  title: _title,
  accounts,
  bank,
  accountNumber,
  accountName,
  bankLogo,
  bank2,
  accountNumber2,
  accountName2,
  bankLogo2,
  style,
}: GiftWidgetProps) {
  const parsed = parseGiftAccounts(accounts, {
    bank,
    accountNumber,
    accountName,
    bankLogo,
    bank2,
    accountNumber2,
    accountName2,
    bankLogo2,
  });
  const list =
    parsed.length > 0
      ? parsed
      : [
          {
            bank: "BNI",
            accountNumber: "2020127190",
            accountName: "Muhammad Ridhwan",
            bankLogo: resolveFallbackBankLogo("BNI"),
          },
        ];
  const [feedback, setFeedback] = useState<{ index: number; ok: boolean } | null>(null);

  async function copy(index: number, account: GiftAccount) {
    const ok = await copyTextToClipboard(account.accountNumber);
    setFeedback({ index, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <WidgetFrame type="gift" style={style} className={styles.gift}>
      {list.length === 0 ? (
        <div className={styles.giftEmpty}>
          <p className={styles.giftEmptyText}>Nomor rekening belum ditambahkan.</p>
        </div>
      ) : (
        <div className={styles.giftCardsStack}>
          {list.map((account, i) => {
            const isCopied = feedback?.index === i && feedback.ok;
            return (
              <div key={`${account.accountNumber}-${i}`} className={styles.giftStandardCard}>
                {/* 1. Logo Bank di tengah atas */}
                <div className={styles.giftBankLogoWrap}>
                  {account.bankLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={account.bankLogo}
                      alt={account.bank || "Bank Logo"}
                      className={styles.giftBankLogoImg}
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.giftBankTextBadge}>
                      {account.bank || "BANK"}
                    </span>
                  )}
                </div>

                {/* 2. Nama Pemilik Rekening */}
                {account.accountName ? (
                  <div className={styles.giftAccountHolder}>{account.accountName}</div>
                ) : null}

                {/* 3. Nomor Rekening */}
                <div className={styles.giftAccountNumber} data-testid="gift-number">
                  {account.accountNumber}
                </div>

                {/* 4. Tombol Salin Pill Navy */}
                <div className={styles.giftCopyActionWrap}>
                  <button
                    type="button"
                    className={[styles.giftCopyPillBtn, isCopied && styles.giftCopyPillBtnCopied]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => void copy(i, account)}
                    aria-label={`Salin nomor ${account.bank || "rekening"} ${account.accountNumber}`}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon className={styles.giftCopyIcon} />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className={styles.giftCopyIcon} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className={styles.hint} role="status" aria-live="polite" data-testid="gift-feedback">
        {feedback ? (feedback.ok ? "Nomor tersalin ✓" : "Gagal menyalin, salin manual.") : ""}
      </p>
    </WidgetFrame>
  );
}

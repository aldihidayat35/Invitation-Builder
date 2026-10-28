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

  return out;
}

/** Bank/e-wallet list with copy-to-clipboard and visible/announced feedback (FR-WDG-008). */
export function GiftWidget({
  title,
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
            bank: "BCA",
            accountNumber: "1234567890",
            accountName: "Nama Mempelai",
            bankLogo: resolveFallbackBankLogo("BCA"),
          },
        ];
  const [feedback, setFeedback] = useState<{ index: number; ok: boolean } | null>(null);
  const heading = s(title) || "Kirim Hadiah";
  const variant = style?.variant ?? "bank-card";

  async function copy(index: number, account: GiftAccount) {
    const ok = await copyTextToClipboard(account.accountNumber);
    setFeedback({ index, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  const isEnvelope = variant === "envelope-tuck";
  const isGold = variant === "gold-ornament";
  const isQr = variant === "qr-showcase";
  const isCard = variant === "bank-card";

  return (
    <WidgetFrame type="gift" style={style} className={styles.gift}>
      {isEnvelope ? (
        <div className={styles.envelopeFlap} aria-hidden="true">
          <span className={styles.envelopeSeal}>✉</span>
        </div>
      ) : null}

      {isGold ? (
        <div className={styles.goldHeaderAccent} aria-hidden="true">
          <span className={styles.goldEmblem}>⚜</span>
        </div>
      ) : null}

      <div className={styles.giftHeading}>
        <span className={styles.eyebrow}>
          {isGold ? "Wedding Gift & Blessing" : isQr ? "Cashless & Transfer" : "Digital Gift"}
        </span>
        <h3 className={styles.label}>{heading}</h3>
        {isGold ? <div className={styles.goldHeadingRule} aria-hidden="true" /> : null}
      </div>

      {list.length === 0 ? (
        <div className={styles.giftEmpty}>
          <p className={styles.giftEmptyText}>Nomor rekening belum ditambahkan.</p>
        </div>
      ) : (
        <ul className={styles.giftList}>
          {list.map((account, i) => {
            const isCopied = feedback?.index === i && feedback.ok;
            return (
              <li key={`${account.accountNumber}-${i}`} className={styles.giftItem}>
                {isCard ? <span className={styles.cardChip} aria-hidden="true" /> : null}

                {isQr ? (
                  <span className={styles.qrBadge} aria-hidden="true">
                    <QrIcon className={styles.qrIcon} />
                  </span>
                ) : account.bankLogo ? (
                  <span className={styles.bankLogoBadge} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={account.bankLogo}
                      alt={account.bank}
                      className={styles.bankLogoImg}
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span className={styles.bankBadge} aria-hidden="true">
                    {(account.bank || "$").slice(0, 4).toLocaleUpperCase()}
                  </span>
                )}

                <span className={styles.giftAccount}>
                  <strong className={styles.giftBank}>
                    {isQr && account.bankLogo ? (
                      <span className={styles.inlineBankLogo} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={account.bankLogo}
                          alt=""
                          className={styles.inlineBankLogoImg}
                        />
                      </span>
                    ) : null}
                    <span>{account.bank}</span>
                  </strong>
                  <span className={styles.giftNumber} data-testid="gift-number">
                    {account.accountNumber}
                  </span>
                  {account.accountName ? (
                    <span className={styles.giftOwner}>a.n. {account.accountName}</span>
                  ) : null}
                </span>

                <button
                  type="button"
                  className={[styles.button, isCopied && styles.buttonCopied]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => void copy(i, account)}
                  aria-label={`Salin nomor ${account.bank || "rekening"} ${account.accountNumber}`}
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className={styles.copyIcon} />
                      <span className={styles.copyLabel}>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className={styles.copyIcon} />
                      <span className={styles.copyLabel}>Salin</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className={styles.hint} role="status" aria-live="polite" data-testid="gift-feedback">
        {feedback ? (feedback.ok ? "Nomor tersalin ✓" : "Gagal menyalin, salin manual.") : ""}
      </p>
    </WidgetFrame>
  );
}

"use client";

import { useState } from "react";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface GiftWidgetProps {
  readonly title?: unknown;
  readonly accounts?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

interface GiftAccount {
  readonly bank: string;
  readonly accountNumber: string;
  readonly accountName: string;
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Picks only known fields from bound collection items. */
export function parseGiftAccounts(accounts: unknown): GiftAccount[] {
  if (!Array.isArray(accounts)) return [];
  const out: GiftAccount[] = [];
  for (const raw of accounts) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const accountNumber = s(rec.accountNumber);
    if (!accountNumber) continue;
    out.push({ bank: s(rec.bank), accountNumber, accountName: s(rec.accountName) });
  }
  return out;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Bank/e-wallet list with copy-to-clipboard and visible/announced feedback (FR-WDG-008). */
export function GiftWidget({ title, accounts, style }: GiftWidgetProps) {
  const list = parseGiftAccounts(accounts);
  const [feedback, setFeedback] = useState<{ index: number; ok: boolean } | null>(null);
  const heading = s(title) || "Kirim Hadiah";

  async function copy(index: number, account: GiftAccount) {
    const ok = await copyText(account.accountNumber);
    setFeedback({ index, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <WidgetFrame type="gift" style={style} className={styles.gift}>
      <h3 className={styles.label}>{heading}</h3>
      <ul className={styles.giftList}>
        {list.map((account, i) => (
          <li key={`${account.accountNumber}-${i}`} className={styles.giftItem}>
            <span>
              <strong>{account.bank}</strong>
              <br />
              <span data-testid="gift-number">{account.accountNumber}</span>
              {account.accountName ? <> · a.n. {account.accountName}</> : null}
            </span>
            <button
              type="button"
              className={styles.button}
              onClick={() => void copy(i, account)}
              aria-label={`Salin nomor ${account.bank || "rekening"} ${account.accountNumber}`}
            >
              Salin
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.hint} role="status" aria-live="polite" data-testid="gift-feedback">
        {feedback ? (feedback.ok ? "Nomor tersalin ✓" : "Gagal menyalin, salin manual.") : ""}
      </p>
    </WidgetFrame>
  );
}

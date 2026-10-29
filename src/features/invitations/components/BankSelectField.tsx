"use client";

import { useRef, useState } from "react";
import type { MasterBankItem } from "@/features/banks";
import { DEFAULT_MASTER_BANKS } from "@/lib/db/repositories/master-banks";
import { resolveFallbackBankLogo } from "@/lib/engine/bank-lock";
import styles from "./VariableFields.module.css";

export interface BankSelectFieldProps {
  readonly id: string;
  readonly bankKey: string;
  readonly logoKey: string;
  readonly namePrefix?: string;
  readonly initialBank?: string;
  readonly initialLogo?: string;
  readonly masterBanks?: readonly MasterBankItem[];
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly describedBy?: string;
}

export function BankSelectField({
  id,
  bankKey,
  logoKey,
  namePrefix = "",
  initialBank = "",
  initialLogo = "",
  masterBanks,
  disabled = false,
  required = false,
  describedBy,
}: BankSelectFieldProps) {
  const bankInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const availableBanks =
    masterBanks && masterBanks.length > 0
      ? masterBanks
      : (DEFAULT_MASTER_BANKS as unknown as MasterBankItem[]);

  const [selectedBank, setSelectedBank] = useState(initialBank);
  const [selectedLogo, setSelectedLogo] = useState(
    initialLogo || (initialBank ? resolveFallbackBankLogo(initialBank) : ""),
  );

  // Determine if initial bank matches any master bank
  const matchedBank = availableBanks.find(
    (b) =>
      b.name.toLowerCase() === (initialBank || "").toLowerCase() ||
      b.code.toLowerCase() === (initialBank || "").toLowerCase(),
  );

  const [presetCode, setPresetCode] = useState<string>(
    matchedBank ? matchedBank.code : initialBank ? "__custom__" : "",
  );
  const [customBankName, setCustomBankName] = useState(matchedBank ? "" : initialBank);

  const handleSelectPreset = (code: string) => {
    setPresetCode(code);
    if (!code) {
      updateValues("", "");
      return;
    }

    if (code === "__custom__") {
      const customName = customBankName.trim();
      const logo = customName ? resolveFallbackBankLogo(customName) : "/images/banks/generic.svg";
      updateValues(customName, logo);
      return;
    }

    const found = availableBanks.find((b) => b.code === code);
    if (found) {
      updateValues(found.name, found.logoUrl);
    }
  };

  const handleCustomNameChange = (name: string) => {
    setCustomBankName(name);
    const trimmed = name.trim();
    const match = availableBanks.find(
      (b) =>
        b.name.toLowerCase() === trimmed.toLowerCase() ||
        b.code.toLowerCase() === trimmed.toLowerCase(),
    );
    const logo = match ? match.logoUrl : resolveFallbackBankLogo(trimmed);
    updateValues(name, logo);
  };

  const updateValues = (bankName: string, logoUrl: string) => {
    setSelectedBank(bankName);
    setSelectedLogo(logoUrl);

    if (bankInputRef.current) {
      bankInputRef.current.value = bankName;
      bankInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      bankInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (logoInputRef.current) {
      logoInputRef.current.value = logoUrl;
      logoInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      logoInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const bankNameAttr = `${namePrefix}${bankKey}`;
  const logoNameAttr = `${namePrefix}${logoKey}`;

  const banksList = availableBanks.filter((b) => b.category === "bank");
  const ewalletsList = availableBanks.filter((b) => b.category !== "bank");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      {/* Hidden inputs to feed FormData and autosave */}
      <input
        ref={bankInputRef}
        type="hidden"
        name={bankNameAttr}
        defaultValue={selectedBank}
        data-testid={`${id}-hidden-bank`}
      />
      <input
        ref={logoInputRef}
        type="hidden"
        name={logoNameAttr}
        defaultValue={selectedLogo}
        data-testid={`${id}-hidden-logo`}
      />

      <div className={styles.bankSelectRow}>
        {/* Logo preview thumbnail */}
        <div className={styles.bankLogoThumbnail} title={selectedBank || "Pilih Bank"}>
          {selectedLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={selectedLogo}
              alt={selectedBank || "Bank Logo"}
              className={styles.bankLogoImg}
            />
          ) : (
            <span className={styles.bankLogoPlaceholder} aria-hidden="true">
              🏦
            </span>
          )}
        </div>

        {/* Combo Box / Select Dropdown */}
        <select
          id={id}
          value={presetCode}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy}
          className={styles.input}
          style={{ flex: 1 }}
          data-testid={`${id}-select`}
          onChange={(e) => handleSelectPreset(e.target.value)}
        >
          <option value="">- Pilih Bank / E-Wallet -</option>
          <optgroup label="Bank Populer">
            {banksList.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Dompet Digital & QRIS">
            {ewalletsList.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </optgroup>
          <option value="__custom__">Bank Lainnya (Ketik Manual)...</option>
        </select>
      </div>

      {/* Optional custom input if __custom__ selected */}
      {presetCode === "__custom__" && (
        <input
          type="text"
          disabled={disabled}
          value={customBankName}
          placeholder="Ketik nama bank lainnya di sini (contoh: Bank BJB, Bank Nagari)…"
          className={styles.input}
          data-testid={`${id}-custom-input`}
          onChange={(e) => handleCustomNameChange(e.target.value)}
        />
      )}
    </div>
  );
}

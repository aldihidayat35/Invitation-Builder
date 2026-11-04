"use client";

import { useEffect, useRef, useState } from "react";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
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
  readonly workspaceId?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly describedBy?: string;
  readonly onChange?: (bank: string, logo: string) => void;
}

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

export function BankSelectField({
  id,
  bankKey,
  logoKey,
  namePrefix = "",
  initialBank = "",
  initialLogo = "",
  masterBanks,
  workspaceId,
  disabled = false,
  required = false,
  describedBy,
  onChange,
}: BankSelectFieldProps) {
  const bankInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableBanks =
    masterBanks && masterBanks.length > 0
      ? masterBanks
      : (DEFAULT_MASTER_BANKS as unknown as MasterBankItem[]);

  const [selectedBank, setSelectedBank] = useState(initialBank);
  const [selectedLogo, setSelectedLogo] = useState(
    initialLogo || (initialBank ? resolveFallbackBankLogo(initialBank) : ""),
  );

  const matchedBank = findMatchingMasterBank(availableBanks, initialBank);

  const [presetCode, setPresetCode] = useState<string>(
    matchedBank ? matchedBank.code : initialBank ? "__custom__" : "",
  );
  const [customBankName, setCustomBankName] = useState(matchedBank ? "" : initialBank);
  const [showCustomLogoBox, setShowCustomLogoBox] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const lastPropBankRef = useRef(initialBank);
  const lastPropLogoRef = useRef(initialLogo);

  // Synchronize internal state ONLY when initialBank or initialLogo props genuinely change from the parent/server
  useEffect(() => {
    if (
      lastPropBankRef.current === initialBank &&
      lastPropLogoRef.current === initialLogo
    ) {
      return;
    }
    lastPropBankRef.current = initialBank;
    lastPropLogoRef.current = initialLogo;

    setSelectedBank(initialBank);
    const resolvedLogo =
      initialLogo || (initialBank ? resolveFallbackBankLogo(initialBank) : "");
    setSelectedLogo(resolvedLogo);

    const found = findMatchingMasterBank(availableBanks, initialBank);
    setPresetCode(found ? found.code : initialBank ? "__custom__" : "");
    setCustomBankName(found ? "" : initialBank);
  }, [initialBank, initialLogo, availableBanks]);

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
    onChange?.(bankName, logoUrl);
  };

  const handleSelectPreset = (code: string) => {
    setPresetCode(code);
    setUploadError(null);
    if (!code) {
      setCustomBankName("");
      updateValues("", "");
      return;
    }

    if (code === "__custom__") {
      const customName = customBankName.trim();
      const logo =
        selectedLogo && selectedLogo !== "/images/banks/generic.svg"
          ? selectedLogo
          : customName
            ? resolveFallbackBankLogo(customName)
            : "/images/banks/generic.svg";
      updateValues(customName, logo);
      return;
    }

    const found = availableBanks.find((b) => b.code === code);
    if (found) {
      setCustomBankName("");
      updateValues(found.name, found.logoUrl);
    }
  };

  const handleCustomNameChange = (name: string) => {
    setCustomBankName(name);
    const trimmed = name.trim();
    const match = findMatchingMasterBank(availableBanks, trimmed);
    // Jika ada logo kustom yang diunggah/diinput, pertahankan logo tersebut
    const isUploadedOrCustomUrl =
      selectedLogo &&
      !selectedLogo.startsWith("/images/banks/") &&
      !selectedLogo.includes("generic.svg");
    const logo = isUploadedOrCustomUrl
      ? selectedLogo
      : match
        ? match.logoUrl
        : resolveFallbackBankLogo(trimmed);
    updateValues(name, logo);
  };

  const handleCustomLogoUrlChange = (url: string) => {
    const trimmed = url.trim();
    updateValues(selectedBank, trimmed);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (file.size > 3 * 1024 * 1024) {
      setUploadError("Ukuran logo maksimal 3MB.");
      return;
    }

    setIsUploading(true);
    try {
      if (workspaceId) {
        const res = await uploadAssetFile(workspaceId, file);
        if (res.ok) {
          const publicUrl = assetUrl(res.asset.id);
          updateValues(selectedBank, publicUrl);
          setShowCustomLogoBox(true);
        } else {
          setUploadError(res.error || "Gagal mengunggah file logo.");
        }
      } else {
        // Fallback jika tidak ada workspaceId (misal admin direct mode)
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === "string") {
            updateValues(selectedBank, dataUrl);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Terjadi kesalahan saat upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetLogo = () => {
    setUploadError(null);
    const defaultLogo = resolveFallbackBankLogo(selectedBank);
    updateValues(selectedBank, defaultLogo);
  };

  const bankNameAttr = `${namePrefix}${bankKey}`;
  const logoNameAttr = `${namePrefix}${logoKey}`;

  const banksList = availableBanks.filter((b) => b.category === "bank");
  const ewalletsList = availableBanks.filter((b) => b.category !== "bank");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {/* Hidden inputs to feed FormData and autosave reliably */}
      <input
        ref={bankInputRef}
        type="hidden"
        name={bankNameAttr}
        value={selectedBank}
        readOnly
        data-testid={`${id}-hidden-bank`}
      />
      <input
        ref={logoInputRef}
        type="hidden"
        name={logoNameAttr}
        value={selectedLogo}
        readOnly
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

      {/* Toggle button to upload or change custom bank logo */}
      {!disabled && (
        <div>
          <button
            type="button"
            className={styles.bankCustomLogoToggle}
            onClick={() => setShowCustomLogoBox((prev) => !prev)}
          >
            {showCustomLogoBox ? "▲ Sembunyikan Pengaturan Logo" : "⚙️ Kustomisasi / Upload Logo Bank"}
          </button>
        </div>
      )}

      {/* Custom Logo Drawer / Upload Controls */}
      {showCustomLogoBox && !disabled && (
        <div className={styles.bankCustomLogoBox}>
          <div className={styles.bankCustomLogoActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/svg+xml,image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileUpload(f);
              }}
            />
            <button
              type="button"
              className={styles.bankUploadBtn}
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              📁 {isUploading ? "Mengunggah Logo…" : "Upload File Logo (SVG/PNG/JPG)"}
            </button>

            {selectedLogo && (
              <button
                type="button"
                className={styles.bankResetLogoBtn}
                onClick={handleResetLogo}
                title="Kembalikan logo ke logo standar bank"
              >
                Reset Logo
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--dash-text-muted, #64748b)" }}>
              Atau gunakan link/URL logo kustom:
            </label>
            <input
              type="text"
              value={selectedLogo}
              placeholder="https://... atau /images/banks/..."
              className={styles.input}
              style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              onChange={(e) => handleCustomLogoUrlChange(e.target.value)}
            />
          </div>

          {uploadError && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: 0 }}>
              {uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

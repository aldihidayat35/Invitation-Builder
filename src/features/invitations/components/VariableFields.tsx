import type { AssetSummary } from "@/features/assets/api";
import type { MasterBankItem } from "@/features/banks";
import { isGiftAccountVariableKey, type FormField, type FormGroup } from "@/lib/engine";
import { BankSelectField } from "./BankSelectField";
import { InvitationImagePicker } from "./InvitationImagePicker";
import styles from "./VariableFields.module.css";

export interface VariableFieldsProps {
  readonly groups: readonly FormGroup[];
  /** Current string value per variable key (already formatted for inputs). */
  readonly values: Readonly<Record<string, string>>;
  /** Field name prefix so the fields can share a form, e.g. `v.`. */
  readonly namePrefix?: string;
  /** Validation message per variable key. */
  readonly errors?: Readonly<Record<string, string>>;
  /** Ready image assets to pick from; without it the image field falls back to an Asset ID input. */
  readonly imageOptions?: readonly { readonly id: string; readonly label: string }[];
  readonly workspaceId?: string;
  readonly initialAssets?: readonly AssetSummary[];
  readonly masterBanks?: readonly MasterBankItem[];
  /** When true, gift/bank variables are rendered read-only for sellers/resellers. */
  readonly readOnlyBank?: boolean;
}

const INPUT_TYPE: Partial<Record<FormField["control"], string>> = {
  text: "text",
  number: "number",
  date: "date",
  "datetime-local": "datetime-local",
  url: "url",
  color: "color",
};

const HINT: Partial<Record<FormField["control"], string>> = {
  coordinate: "lat, lng - contoh: -7.8, 110.36",
  image: "Pilih gambar dari Asset Library (atau isi Asset ID)",
  collection: 'JSON array - mis. [{"title":"Akad"}]',
  richtext: "Teks polos (rich text terbatas)",
};

/**
 * Generic form fields generated from VariableDefinition (FR-INV-002). Pure
 * presentational primitives, reused by the Data Mode screen (Fase 8).
 */
export function VariableFields({
  groups,
  values,
  namePrefix = "",
  errors = {},
  imageOptions,
  workspaceId,
  initialAssets,
  masterBanks,
  readOnlyBank = false,
}: VariableFieldsProps) {
  return (
    <div className={styles.groups}>
      {groups.map((group) => {
        // Sembunyikan input manual URL logo bank karena sudah ditangani otomatis oleh combo box pilihan bank
        const visibleFields = group.fields.filter((f) => {
          const k = f.key.toLowerCase().trim();
          return (
            k !== "gift.banklogo" &&
            k !== "gift.bank_logo" &&
            k !== "banklogo" &&
            k !== "gift.banklogo2" &&
            k !== "gift.bank_logo2" &&
            k !== "banklogo2" &&
            k !== "rekening.banklogo" &&
            k !== "rekening.banklogo2"
          );
        });

        return (
          <fieldset key={group.group} className={styles.group}>
            <legend className={styles.legend}>{group.label}</legend>
            {visibleFields.map((field) => {
              const id = `var-${field.key}`;
              const name = `${namePrefix}${field.key}`;
              const value = values[field.key] ?? "";
              const error = errors[field.key];
              const isBankField = isGiftAccountVariableKey(field.key);
              const isFieldLocked = isBankField && readOnlyBank;
              const hintId = `${id}-hint`;
              const describedBy =
                error || HINT[field.control] || isFieldLocked ? hintId : undefined;

              const keyLower = field.key.toLowerCase().trim();
              const isBank2 =
                keyLower === "gift.bank2" ||
                keyLower === "gift.bank_name2" ||
                keyLower === "bank2" ||
                keyLower === "rekening.bank2" ||
                keyLower === "rekening_bank2" ||
                keyLower === "digital_gift.bank2";
              const isBank1 =
                !isBank2 &&
                (keyLower === "gift.bank" ||
                  keyLower === "gift.bank_name" ||
                  keyLower === "gift.bank1" ||
                  keyLower === "gift.bank_name1" ||
                  keyLower === "bank" ||
                  keyLower === "bank1" ||
                  keyLower === "rekening.bank" ||
                  keyLower === "rekening_bank" ||
                  keyLower === "digital_gift.bank");

              const logoKey = isBank1 ? "gift.bankLogo" : "gift.bankLogo2";
              const initialLogo = isBank1
                ? values["gift.bankLogo"] ??
                  values["gift.bank_logo"] ??
                  values["bankLogo"] ??
                  values["rekening.bankLogo"] ??
                  ""
                : values["gift.bankLogo2"] ??
                  values["gift.bank_logo2"] ??
                  values["bankLogo2"] ??
                  values["rekening.bankLogo2"] ??
                  "";

              return (
                <div
                  key={field.key}
                  className={styles.field}
                  data-invalid={error ? "true" : undefined}
                >
                  <label htmlFor={id} className={styles.label}>
                    {field.label}
                    {field.required ? (
                      <span className={styles.required} aria-hidden="true">
                        {" "}
                        *
                      </span>
                    ) : null}
                    {isFieldLocked && (
                      <span
                        className={styles.bankLockBadge}
                        title="Kolom rekening hanya dapat diverifikasi dan diisi resmi oleh Admin melalui detail pesanan."
                      >
                        🔒 Terkunci oleh Admin
                      </span>
                    )}
                  </label>
                  {isBank1 || isBank2 ? (
                    <BankSelectField
                      id={id}
                      bankKey={field.key}
                      logoKey={logoKey}
                      namePrefix={namePrefix}
                      initialBank={value}
                      initialLogo={initialLogo}
                      masterBanks={masterBanks}
                      workspaceId={workspaceId}
                      disabled={isFieldLocked}
                      required={field.required}
                      describedBy={describedBy}
                    />
                  ) : field.control === "image" ? (
                  <InvitationImagePicker
                    id={id}
                    name={name}
                    label={field.label}
                    value={value}
                    required={field.required}
                    imageOptions={imageOptions}
                    workspaceId={workspaceId}
                    initialAssets={initialAssets}
                    describedBy={describedBy}
                  />
                ) : field.control === "select" ? (
                  <select
                    id={id}
                    name={name}
                    defaultValue={value}
                    disabled={isFieldLocked}
                    className={styles.input}
                    required={field.required}
                    aria-describedby={describedBy}
                  >
                    <option value="">-</option>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.control === "textarea" ? (
                  <textarea
                    id={id}
                    name={name}
                    defaultValue={value}
                    disabled={isFieldLocked}
                    className={styles.input}
                    rows={3}
                    maxLength={field.maxLength}
                    required={field.required}
                    aria-describedby={describedBy}
                  />
                ) : field.control === "checkbox" ? (
                  <input
                    id={id}
                    name={name}
                    type="checkbox"
                    disabled={isFieldLocked}
                    defaultChecked={value === "on"}
                    aria-describedby={describedBy}
                  />
                ) : (
                  <input
                    id={id}
                    name={name}
                    type={INPUT_TYPE[field.control] ?? "text"}
                    defaultValue={value}
                    disabled={isFieldLocked}
                    className={styles.input}
                    required={field.required}
                    maxLength={field.maxLength}
                    min={field.min}
                    max={field.max}
                    step={field.integer ? 1 : field.type === "number" ? "any" : undefined}
                    aria-describedby={describedBy}
                  />
                )}
                {error ? (
                  <p id={hintId} className={styles.error}>
                    {error}
                  </p>
                ) : isFieldLocked ? (
                  <p id={hintId} className={styles.hint} style={{ color: "#b45309" }}>
                    Variabel rekening dilindungi demi keamanan. Hanya Super Admin yang dapat memverifikasi atau mengubah rekening live melalui Detail Pesanan.
                  </p>
                ) : HINT[field.control] ? (
                  <p id={hintId} className={styles.hint}>
                    {HINT[field.control]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      );
    })}
    </div>
  );
}

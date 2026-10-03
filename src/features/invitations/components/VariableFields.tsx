import type { FormField, FormGroup } from "@/lib/engine";
import styles from "./VariableFields.module.css";

export interface VariableFieldsProps {
  readonly groups: readonly FormGroup[];
  /** Current string value per variable key (already formatted for inputs). */
  readonly values: Readonly<Record<string, string>>;
  /** Field name prefix so the fields can share a form, e.g. `v.`. */
  readonly namePrefix?: string;
  /** Validation message per variable key. */
  readonly errors?: Readonly<Record<string, string>>;
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
  image: "Asset ID (UUID) - upload hadir di Fase 5",
  collection: "JSON array - UI daftar hadir di Fase 8",
  richtext: "Teks polos (rich text terbatas)",
};

/**
 * Generic form fields generated from VariableDefinition (FR-INV-002). Pure
 * presentational primitives - the final Data Mode screen is built in Fase 8.
 */
export function VariableFields({
  groups,
  values,
  namePrefix = "",
  errors = {},
}: VariableFieldsProps) {
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <fieldset key={group.group} className={styles.group}>
          <legend className={styles.legend}>{group.label}</legend>
          {group.fields.map((field) => {
            const id = `var-${field.key}`;
            const name = `${namePrefix}${field.key}`;
            const value = values[field.key] ?? "";
            const error = errors[field.key];
            const hintId = `${id}-hint`;
            const describedBy = error || HINT[field.control] ? hintId : undefined;
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
                </label>
                {field.control === "select" ? (
                  <select
                    id={id}
                    name={name}
                    defaultValue={value}
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
                    defaultChecked={value === "on"}
                    aria-describedby={describedBy}
                  />
                ) : (
                  <input
                    id={id}
                    name={name}
                    type={INPUT_TYPE[field.control] ?? "text"}
                    defaultValue={value}
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
                ) : HINT[field.control] ? (
                  <p id={hintId} className={styles.hint}>
                    {HINT[field.control]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

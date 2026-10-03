"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./editor.module.css";

export function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export interface NumberFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly disabled?: boolean;
  /** Display precision; values are stored with full precision. */
  readonly decimals?: number;
}

/**
 * Numeric input that commits on Enter/blur (not per keystroke), so typing
 * "120" never produces intermediate history entries or invalid values.
 */
export function NumberField({
  id,
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  disabled,
  decimals = 2,
}: NumberFieldProps) {
  const format = (n: number) => String(Number(n.toFixed(decimals)));
  // `draft` is only set while the user is typing; otherwise the prop is shown (no effect sync needed).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? format(value);

  const commit = () => {
    const parsed = Number(text);
    setDraft(null);
    if (text.trim() === "" || !Number.isFinite(parsed)) return;
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onCommit(next);
  };

  return (
    <FieldRow label={label} htmlFor={id}>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="decimal"
        value={text}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </FieldRow>
  );
}

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
  readonly disabled?: boolean;
  readonly multiline?: boolean;
  readonly maxLength?: number;
}

export function TextField({
  id,
  label,
  value,
  onCommit,
  disabled,
  multiline,
  maxLength,
}: TextFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;

  const common = {
    id,
    className: styles.input,
    value: text,
    disabled,
    maxLength,
    onBlur: () => {
      if (draft !== null && draft !== value) onCommit(draft);
      setDraft(null);
    },
  };
  return (
    <FieldRow label={label} htmlFor={id}>
      {multiline ? (
        <textarea
          {...common}
          rows={3}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(e.target.value);
          }}
        />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      )}
    </FieldRow>
  );
}

export interface SelectOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly group?: string;
  readonly fontFamily?: string;
}

export interface SelectFieldProps<T extends string | number> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}

export function SelectField<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: SelectFieldProps<T>) {
  const hasGroups = options.some((o) => o.group);

  return (
    <FieldRow label={label} htmlFor={id}>
      <select
        id={id}
        className={styles.input}
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {hasGroups
          ? Array.from(new Set(options.map((o) => o.group || ""))).map((groupName) => {
              const groupOptions = options.filter((o) => (o.group || "") === groupName);
              if (!groupName) {
                return groupOptions.map((o) => (
                  <option
                    key={String(o.value)}
                    value={String(o.value)}
                    style={
                      o.fontFamily
                        ? { fontFamily: `'${o.fontFamily}', cursive, sans-serif` }
                        : undefined
                    }
                  >
                    {o.label}
                  </option>
                ));
              }
              return (
                <optgroup key={groupName} label={groupName}>
                  {groupOptions.map((o) => (
                    <option
                      key={String(o.value)}
                      value={String(o.value)}
                      style={
                        o.fontFamily
                          ? { fontFamily: `'${o.fontFamily}', cursive, sans-serif` }
                          : undefined
                      }
                    >
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              );
            })
          : options.map((o) => (
              <option
                key={String(o.value)}
                value={String(o.value)}
                style={
                  o.fontFamily
                    ? { fontFamily: `'${o.fontFamily}', cursive, sans-serif` }
                    : undefined
                }
              >
                {o.label}
              </option>
            ))}
      </select>
    </FieldRow>
  );
}

export type ColorValue = string | { token: string };

export interface ColorFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: ColorValue | undefined;
  /** Resolved hex shown in the picker. */
  readonly resolvedHex: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly onChange: (value: ColorValue | undefined) => void;
  /** Offer a "none" choice (e.g. shape without fill). */
  readonly allowNone?: boolean;
  readonly disabled?: boolean;
}

export function ColorField({
  id,
  label,
  value,
  resolvedHex,
  tokens,
  onChange,
  allowNone,
  disabled,
}: ColorFieldProps) {
  const tokenId = useId();
  const tokenNames = Object.keys(tokens);
  const current =
    value === undefined ? "__none" : typeof value === "string" ? "__custom" : value.token;
  // <input type=color> only accepts #rrggbb.
  const pickerHex = /^#[0-9a-fA-F]{6}$/.test(resolvedHex) ? resolvedHex : "#000000";

  return (
    <FieldRow label={label} htmlFor={id}>
      <div className={styles.colorRow}>
        <input
          id={id}
          type="color"
          className={styles.colorInput}
          value={pickerHex}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
        {tokenNames.length > 0 || allowNone ? (
          <select
            id={tokenId}
            className={styles.input}
            aria-label={`${label} - sumber warna`}
            value={current}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__none") onChange(undefined);
              else if (v === "__custom") onChange(pickerHex);
              else onChange({ token: v });
            }}
          >
            {allowNone ? <option value="__none">Tanpa warna</option> : null}
            <option value="__custom">Kustom</option>
            {tokenNames.map((name) => (
              <option key={name} value={name}>
                Token: {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </FieldRow>
  );
}

export interface OpacityFieldProps {
  readonly id: string;
  readonly value: number; // 0 to 1
  readonly onChange: (opacity: number) => void;
  readonly disabled?: boolean;
  readonly label?: string;
}

const OPACITY_PRESETS = [100, 75, 50, 25, 0] as const;

export function OpacityField({
  id,
  value,
  onChange,
  disabled,
  label = "Tingkat Opasitas",
}: OpacityFieldProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value * 100)));

  return (
    <div className={styles.opacityControl} data-testid={`${id}-wrapper`}>
      <div className={styles.opacityHeader}>
        <span className={styles.opacityLabel}>{label}</span>
        <div className={styles.opacityValueWrap}>
          <div
            className={styles.opacitySwatch}
            title={`Pratinjau transparansi: ${percent}%`}
            aria-hidden="true"
          >
            <div className={styles.opacitySwatchFill} style={{ opacity: percent / 100 }} />
          </div>
          <div className={styles.opacityInputWrap}>
            <input
              id={id}
              type="number"
              min={0}
              max={100}
              step={1}
              value={percent}
              disabled={disabled}
              className={styles.opacityNumberInput}
              aria-label={label}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val)) {
                  onChange(Math.min(100, Math.max(0, val)) / 100);
                }
              }}
            />
            <span className={styles.opacityUnit}>%</span>
          </div>
        </div>
      </div>

      <div className={styles.opacitySliderTrack}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          disabled={disabled}
          className={styles.opacitySlider}
          aria-label={`${label} slider`}
          onChange={(e) => {
            onChange(Number(e.target.value) / 100);
          }}
        />
      </div>

      <div className={styles.opacityPresets} role="group" aria-label="Preset opasitas">
        {OPACITY_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={styles.opacityPresetBtn}
            aria-pressed={percent === p}
            disabled={disabled}
            onClick={() => onChange(p / 100)}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  RUNTIME_CONTEXT_VARIABLES,
  isBindingCompatible,
  variableKeySchema,
  type BindingSlotType,
  type VariableType,
} from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { FieldRow } from "./fields";
import styles from "./editor.module.css";

/** Variable type created by "buat variabel baru" for a slot (slots without an entry cannot create one). */
const CREATABLE: Partial<Record<BindingSlotType, { type: VariableType; defaultKey: string }>> = {
  image: { type: "image", defaultKey: "photo.main" },
  text: { type: "text", defaultKey: "text.custom" },
  coordinate: { type: "coordinate", defaultKey: "event.location" },
  datetime: { type: "datetime", defaultKey: "event.startAt" },
};

const STATIC = "__static";

function labelFromKey(key: string): string {
  const text = key.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function uniqueKey(taken: ReadonlySet<string>, base: string): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

export interface BindingControlProps {
  readonly id: string;
  readonly slot: BindingSlotType;
  /** Variable key currently bound, if any. */
  readonly boundKey: string | undefined;
  readonly onBind: (key: string) => void;
  /** Switch back to a static value. */
  readonly onUnbind: () => void;
  /** Default value for a newly created variable (e.g. the current image asset). */
  readonly newVariableDefault?: unknown;
  readonly disabled?: boolean;
}

/**
 * Chooses which variable fills a slot (FR-VAR-002). Only type-compatible
 * variables are offered (binding-compat matrix), so an invalid binding cannot
 * be authored from the UI; the server re-validates on save/publish anyway.
 */
export function BindingControl({
  id,
  slot,
  boundKey,
  onBind,
  onUnbind,
  newVariableDefault,
  disabled,
}: BindingControlProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const declared = doc.variables.filter((v) => isBindingCompatible(slot, v.type));
  const declaredKeys = new Set(doc.variables.map((v) => v.key));
  const runtime = Object.entries(RUNTIME_CONTEXT_VARIABLES).filter(
    ([key, type]) => !declaredKeys.has(key) && isBindingCompatible(slot, type),
  );
  const creatable = CREATABLE[slot];

  function startCreate() {
    if (!creatable) return;
    setNewKey(uniqueKey(declaredKeys, creatable.defaultKey));
    setError(null);
    setCreating(true);
  }

  function create() {
    if (!creatable) return;
    const key = newKey.trim();
    if (!variableKeySchema.safeParse(key).success) {
      setError("Kunci harus berupa dot path, mis. couple.bride.photo");
      return;
    }
    if (declaredKeys.has(key)) {
      setError("Kunci sudah dipakai.");
      return;
    }
    store.getState().addVariable({
      key,
      label: labelFromKey(key),
      type: creatable.type,
      required: false,
      ...(newVariableDefault !== undefined ? { default: newVariableDefault } : {}),
    } as Parameters<ReturnType<typeof store.getState>["addVariable"]>[0]);
    if (!store.getState().history.present.variables.some((v) => v.key === key)) {
      setError("Variabel tidak dapat dibuat.");
      return;
    }
    setCreating(false);
    onBind(key);
  }

  return (
    <div className={styles.panelStack}>
      <FieldRow label="Sumber data" htmlFor={id}>
        <select
          id={id}
          className={styles.input}
          value={boundKey ?? STATIC}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            if (value === STATIC) onUnbind();
            else onBind(value);
          }}
        >
          <option value={STATIC}>Nilai statis</option>
          {declared.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label} ({v.key})
            </option>
          ))}
          {runtime.map(([key]) => (
            <option key={key} value={key}>
              {key} (runtime)
            </option>
          ))}
          {boundKey &&
          !declared.some((v) => v.key === boundKey) &&
          !runtime.some(([key]) => key === boundKey) ? (
            <option value={boundKey}>{boundKey} (tidak valid)</option>
          ) : null}
        </select>
      </FieldRow>

      {creatable && !disabled ? (
        creating ? (
          <div className={styles.panelStack}>
            <FieldRow label="Kunci variabel baru" htmlFor={`${id}-newkey`}>
              <input
                id={`${id}-newkey`}
                className={styles.input}
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
              />
            </FieldRow>
            {error ? (
              <p className={styles.errorText} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.smallButton}
                data-testid={`${id}-create`}
                onClick={create}
              >
                Buat &amp; hubungkan
              </button>
              <button
                type="button"
                className={styles.smallButton}
                onClick={() => setCreating(false)}
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.smallButton}
            data-testid={`${id}-new`}
            onClick={startCreate}
          >
            + Variabel baru
          </button>
        )
      ) : null}
    </div>
  );
}

"use client";

import type { Element } from "@/lib/schema";
import { defaultWidgetRegistry, type WidgetPropDefinition } from "@/features/widgets";
import { BindingControl } from "./BindingControl";
import { useEditorStore } from "./EditorProvider";
import { FieldRow, NumberField, SelectField, TextField } from "./fields";
import styles from "./editor.module.css";

type WidgetElement = Extract<Element, { type: "widget" }>;

const TIME_ZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"].map((value) => ({
  value,
  label: value,
}));

/** Used only until the user types the first coordinate; clearly editable (Jakarta). */
const DEFAULT_COORDINATE = { lat: -6.2, lng: 106.8167 };

const isBinding = (value: unknown): value is { bind: string } =>
  typeof value === "object" && value !== null && "bind" in value;

function controlOf(spec: WidgetPropDefinition): NonNullable<WidgetPropDefinition["control"]> {
  if (spec.control) return spec.control;
  if (spec.slot === "coordinate") return "coordinate";
  if (spec.slot === "datetime") return "datetime";
  if (spec.slot === "boolean") return "boolean";
  if (spec.slot === "number") return "number";
  if (spec.slot === "collection") return "binding";
  return "text";
}

/**
 * Inspector for a widget, generated entirely from the registry's props schema
 * metadata (FR-WDG-001): adding a widget needs no inspector code. Bindings are
 * offered only for type-compatible variables.
 */
export function WidgetPanel({ element, readOnly }: { element: WidgetElement; readOnly: boolean }) {
  const store = useEditorStore();
  const resolved = defaultWidgetRegistry.resolve(element.widgetType);
  const disabled = readOnly || element.locked;

  if (resolved.kind === "unknown") {
    return (
      <div className={styles.panelStack} data-testid="widget-inspector">
        <p className={styles.muted} data-testid="widget-unknown">
          {resolved.fallback.label}: &ldquo;{element.widgetType}&rdquo; tidak terdaftar di versi
          aplikasi ini. Elemen dipertahankan apa adanya.
        </p>
      </div>
    );
  }

  const { definition } = resolved;
  const setProp = (name: string, value: unknown) =>
    store.getState().patchElement(
      element.id,
      (el) => {
        if (el.type !== "widget") return el;
        const props = { ...el.props };
        if (value === undefined) delete props[name];
        else props[name] = value as (typeof props)[string];
        return { ...el, props };
      },
      `prop:${name}`,
    );

  return (
    <div className={styles.panelStack} data-testid="widget-inspector">
      {Object.entries(definition.props).map(([name, spec]) => {
        const value = element.props[name];
        const bound = isBinding(value);
        const control = controlOf(spec);
        const fieldId = `insp-widget-${name}`;
        return (
          <div key={name} className={styles.panelStack} data-testid={`widget-prop-${name}`}>
            <p className={styles.fieldLabel}>
              {spec.label}
              {spec.required ? <span className={styles.badge}>Wajib</span> : null}
            </p>
            <BindingControl
              id={`${fieldId}-bind`}
              slot={spec.slot}
              boundKey={bound ? value.bind : undefined}
              disabled={disabled}
              onBind={(key) => setProp(name, { bind: key })}
              onUnbind={() => setProp(name, definition.defaultProps[name])}
            />
            {bound ? null : (
              <StaticControl
                id={fieldId}
                control={control}
                spec={spec}
                value={value}
                disabled={disabled}
                onChange={(next) => setProp(name, next)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StaticControl({
  id,
  control,
  spec,
  value,
  disabled,
  onChange,
}: {
  id: string;
  control: NonNullable<WidgetPropDefinition["control"]>;
  spec: WidgetPropDefinition;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  switch (control) {
    case "select": {
      const options = spec.options ?? [];
      return (
        <SelectField
          id={id}
          label={spec.label}
          value={typeof value === "string" ? value : (options[0]?.value ?? "")}
          options={options}
          disabled={disabled}
          onChange={onChange}
        />
      );
    }
    case "coordinate": {
      const coord =
        typeof value === "object" && value !== null && "lat" in value && "lng" in value
          ? (value as { lat: number; lng: number })
          : undefined;
      const current = coord ?? DEFAULT_COORDINATE;
      return (
        <div className={styles.grid2}>
          <NumberField
            id={`${id}-lat`}
            label="Latitude"
            value={current.lat}
            min={-90}
            max={90}
            step={0.0001}
            decimals={6}
            disabled={disabled}
            onCommit={(lat) => onChange({ ...current, lat })}
          />
          <NumberField
            id={`${id}-lng`}
            label="Longitude"
            value={current.lng}
            min={-180}
            max={180}
            step={0.0001}
            decimals={6}
            disabled={disabled}
            onCommit={(lng) => onChange({ ...current, lng })}
          />
        </div>
      );
    }
    case "datetime": {
      const dt =
        typeof value === "object" && value !== null && "local" in value
          ? (value as { local: string; timeZone: string })
          : undefined;
      const timeZone = dt?.timeZone ?? "Asia/Jakarta";
      return (
        <div className={styles.panelStack}>
          <FieldRow label="Tanggal & jam (lokal)" htmlFor={`${id}-local`}>
            <input
              id={`${id}-local`}
              className={styles.input}
              type="datetime-local"
              value={dt?.local.slice(0, 16) ?? ""}
              disabled={disabled}
              onChange={(event) => {
                if (event.target.value) onChange({ local: event.target.value, timeZone });
              }}
            />
          </FieldRow>
          <SelectField
            id={`${id}-tz`}
            label="Zona waktu"
            value={timeZone}
            options={TIME_ZONES}
            disabled={disabled}
            onChange={(tz) => onChange({ local: dt?.local ?? "2030-01-01T10:00", timeZone: tz })}
          />
        </div>
      );
    }
    case "record": {
      const record =
        typeof value === "object" && value !== null ? (value as Record<string, string>) : {};
      return (
        <div className={styles.grid2}>
          {(spec.fields ?? []).map((field) => (
            <TextField
              key={field.key}
              id={`${id}-${field.key}`}
              label={field.label}
              value={record[field.key] ?? ""}
              disabled={disabled}
              maxLength={20}
              onCommit={(text) => {
                const next = { ...record };
                if (text.trim()) next[field.key] = text.trim();
                else delete next[field.key];
                onChange(next);
              }}
            />
          ))}
        </div>
      );
    }
    case "boolean":
      return (
        <label className={styles.fieldLabel}>
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />{" "}
          {spec.label}
        </label>
      );
    case "number":
      return (
        <NumberField
          id={id}
          label={spec.label}
          value={typeof value === "number" ? value : 1}
          min={1}
          max={20}
          step={1}
          decimals={0}
          disabled={disabled}
          onCommit={onChange}
        />
      );
    case "binding":
      return (
        <p className={styles.muted}>
          Hubungkan ke variabel koleksi di atas; isi data lewat Data Mode undangan.
        </p>
      );
    default:
      return (
        <TextField
          id={id}
          label={spec.label}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          maxLength={200}
          onCommit={(text) => onChange(text === "" ? undefined : text)}
        />
      );
  }
}

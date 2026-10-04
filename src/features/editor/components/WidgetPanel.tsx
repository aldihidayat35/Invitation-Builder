"use client";

import type { Element, ThemeTokens } from "@/lib/schema";
import {
  defaultWidgetRegistry,
  getWidgetStyleVariants,
  QUICK_COLOR_PALETTES,
  resolveWidgetStyleVariant,
  type WidgetStyleVariant,
  type WidgetPropDefinition,
} from "@/features/widgets";
import { BindingControl } from "./BindingControl";
import { GalleryItemsControl } from "./GalleryItemsControl";
import { GiftAccountsControl } from "./GiftAccountsControl";
import { PhotoFrameImageControl } from "./PhotoFrameImageControl";
import { TimelineEventsControl } from "./TimelineEventsControl";
import { WishesItemsControl } from "./WishesItemsControl";
import { CouplePersonControl } from "./CouplePersonControl";
import { useEditorStore } from "./EditorProvider";
import {
  ColorField,
  FieldRow,
  NumberField,
  SelectField,
  TextField,
  type ColorValue,
} from "./fields";
import { resolveColor } from "../core/display";
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
 * Inspector for a widget: 5 style variations, color & theme customization,
 * and dynamic props schema bindings (FR-WDG-001).
 */
export function WidgetPanel({
  element,
  readOnly,
  tokens,
}: {
  element: WidgetElement;
  readOnly: boolean;
  tokens?: ThemeTokens;
}) {
  const store = useEditorStore();
  const resolved = defaultWidgetRegistry.resolve(element.widgetType);
  const disabled = readOnly || element.locked;
  const variants = getWidgetStyleVariants(element.widgetType);
  const variantResolution = resolveWidgetStyleVariant(element.widgetType, element.style.variant);
  const currentVariant = variantResolution.variant.id;
  const galleryLayoutFollowsVariant =
    element.widgetType === "gallery" && variantResolution.kind === "current";

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

  const setStyle = (patch: Partial<WidgetElement["style"]>) =>
    store.getState().patchStyle([element.id], patch);

  const colors = tokens?.colors ?? {};

  return (
    <div className={styles.panelStack} data-testid="widget-inspector">
      {/* 1. Style Variations */}
      <div className={styles.panelStack}>
        <p className={styles.widgetSectionTitle}>Pilihan Gaya ({variants.length} Variasi)</p>
        {variantResolution.kind !== "current" ? (
          <div
            className={
              variantResolution.kind === "fallback"
                ? styles.widgetVariantWarning
                : styles.widgetLegacyNotice
            }
            data-testid="widget-legacy-variant"
          >
            <strong>
              {variantResolution.kind === "fallback"
                ? "Variasi tidak dikenal"
                : variantResolution.variant.label}
            </strong>
            <span>
              {variantResolution.kind === "fallback"
                ? `“${variantResolution.requestedVariant}” tidak tersedia; editor memakai tampilan lama yang aman.`
                : "Tampilan ini dipertahankan agar desain lama tidak berubah. Pilih salah satu gaya baru untuk memperbaruinya."}
            </span>
          </div>
        ) : null}
        <div className={styles.widgetVariantGrid} data-testid="widget-variants">
          {variants.map((v) => {
            const active = currentVariant === v.id;
            return (
              <button
                key={v.id}
                type="button"
                className={[styles.widgetVariantCard, active && styles.widgetVariantCardActive]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`widget-variant-${v.id}`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() =>
                  setStyle({
                    variant: v.id,
                    radius: v.defaultRadius !== undefined ? v.defaultRadius : element.style.radius,
                  })
                }
              >
                <WidgetVariantThumbnail widgetType={element.widgetType} variant={v} />
                <span className={styles.widgetVariantLabel}>
                  {active ? "✓ " : ""}
                  {v.label}
                </span>
                <span className={styles.widgetVariantDesc}>{v.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Color Selection & Theme Customization */}
      <div className={styles.panelStack}>
        <p className={styles.widgetSectionTitle}>Warna &amp; Tema Widget</p>

        {/* Quick Palette Swatches */}
        <div className={styles.widgetPaletteBar} data-testid="widget-palettes">
          {QUICK_COLOR_PALETTES.map((pal) => (
            <button
              key={pal.name}
              type="button"
              className={styles.paletteChip}
              disabled={disabled}
              title={`Terapkan tema ${pal.name}`}
              onClick={() => setStyle({ color: pal.color, background: pal.background })}
            >
              <span className={styles.paletteDot} style={{ background: pal.color }} />
              <span>{pal.name}</span>
            </button>
          ))}
        </div>

        <ColorField
          id={`insp-widget-color-${element.id}`}
          label="Warna Teks & Aksen"
          value={element.style.color as ColorValue}
          resolvedHex={resolveColor(element.style.color, tokens ?? { colors: {} }, "#2b2118")}
          tokens={colors}
          disabled={disabled}
          onChange={(color) => color !== undefined && setStyle({ color })}
        />

        <ColorField
          id={`insp-widget-bg-${element.id}`}
          label="Warna Latar Belakang"
          value={element.style.background as ColorValue | undefined}
          resolvedHex={resolveColor(
            element.style.background,
            tokens ?? { colors: {} },
            "transparent",
          )}
          tokens={colors}
          allowNone
          disabled={disabled}
          onChange={(background) => setStyle({ background })}
        />

        <NumberField
          id={`insp-widget-radius-${element.id}`}
          label="Radius Sudut (px)"
          value={element.style.radius ?? 0}
          min={0}
          max={999}
          step={1}
          disabled={disabled}
          onCommit={(radius) => setStyle({ radius })}
        />
      </div>

      {/* 3. Content Properties */}
      <div className={styles.panelStack}>
        <p className={styles.widgetSectionTitle}>Konten &amp; Properti</p>
        {galleryLayoutFollowsVariant ? (
          <p className={styles.widgetLayoutNotice} data-testid="gallery-layout-notice">
            Tata letak galeri mengikuti gaya <strong>{variantResolution.variant.label}</strong>.
            Pilihan grid/slider lama tetap disimpan untuk kompatibilitas.
          </p>
        ) : null}
        {Object.entries(definition.props).map(([name, spec]) => {
          if (name === "layout" && galleryLayoutFollowsVariant) return null;
          if (name === "title" && element.widgetType === "gallery") return null;
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
              {bound ? null : element.widgetType === "gallery" && name === "items" ? (
                <GalleryItemsControl
                  elementId={element.id}
                  value={value}
                  disabled={disabled}
                  onChange={(items) => setProp(name, items)}
                />
              ) : element.widgetType === "gift" && name === "accounts" ? (
                <GiftAccountsControl
                  elementId={element.id}
                  value={value}
                  disabled={disabled}
                  onChange={(accounts) => setProp(name, accounts)}
                />
              ) : element.widgetType === "photoFrame" && name === "image" ? (
                <PhotoFrameImageControl
                  value={value}
                  disabled={disabled}
                  onChange={(img) => setProp(name, img)}
                />
              ) : element.widgetType === "timeline" && name === "events" ? (
                <TimelineEventsControl
                  elementId={element.id}
                  value={value}
                  disabled={disabled}
                  onChange={(events) => setProp(name, events)}
                />
              ) : element.widgetType === "wishes" && name === "items" ? (
                <WishesItemsControl
                  elementId={element.id}
                  value={value}
                  disabled={disabled}
                  onChange={(items) => setProp(name, items)}
                />
              ) : element.widgetType === "coupleProfile" && (name === "groom" || name === "bride") ? (
                <CouplePersonControl
                  personType={name as "groom" | "bride"}
                  label={name === "groom" ? "Mempelai Pria" : "Mempelai Wanita"}
                  value={value}
                  disabled={disabled}
                  onChange={(personData: Record<string, unknown>) => setProp(name, personData)}
                />
              ) : (
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
    </div>
  );
}

function WidgetVariantThumbnail({
  widgetType,
  variant,
}: {
  widgetType: string;
  variant: WidgetStyleVariant;
}) {
  return (
    <span
      className={styles.widgetVariantPreview}
      data-preview-widget={widgetType}
      data-preview-variant={variant.id}
      aria-hidden="true"
    >
      <span className={styles.widgetVariantPreviewPrimary} />
      <span className={styles.widgetVariantPreviewSecondary} />
      <span className={styles.widgetVariantPreviewTertiary} />
      <span className={styles.widgetVariantPreviewAction} />
    </span>
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

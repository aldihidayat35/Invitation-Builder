"use client";

import type { Element, ThemeTokens } from "@/lib/schema";
import {
  defaultWidgetRegistry,
  estimateWidgetContentHeight,
  getWidgetStyleVariants,
  QUICK_COLOR_PALETTES,
  resolveWidgetStyleVariant,
  type WidgetStyleVariant,
  type WidgetPropDefinition,
} from "@/features/widgets";
import { getOrnamentShape } from "@/features/widgets/ornament-shapes";
import { FONT_CATEGORIES, INVITATION_FONTS, ensureFontLoaded } from "@/lib/fonts";
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
  OpacityField,
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

  const estimatedH = estimateWidgetContentHeight(element);
  const isOverflowing = estimatedH > element.frame.h + 5;
  const isDifferent = Math.abs(estimatedH - element.frame.h) > 5;

  const handleFitToContent = () => {
    store.getState().patchElement(
      element.id,
      (el) => ({
        ...el,
        frame: {
          ...el.frame,
          h: Math.round(estimatedH),
        },
      }),
      "widget:fit-to-content",
    );

    const currentDoc = store.getState().history.present;
    const parentSection = currentDoc.sections.find((s) =>
      s.elements.some((el) => el.id === element.id),
    );
    if (parentSection) {
      const requiredBottom = element.frame.y + estimatedH + 40;
      if (requiredBottom > parentSection.baseHeight) {
        store.getState().patchSection(parentSection.id, {
          baseHeight: Math.ceil(requiredBottom),
        });
      }
    }
  };

  return (
    <div className={styles.panelStack} data-testid="widget-inspector">
      {/* 0. Content Height & Fit Control */}
      <div
        className={styles.panelStack}
        style={{
          padding: "10px 12px",
          borderRadius: "8px",
          background: isOverflowing ? "rgba(225, 29, 72, 0.08)" : "rgba(0, 0, 0, 0.04)",
          border: `1px solid ${isOverflowing ? "rgba(225, 29, 72, 0.3)" : "rgba(0, 0, 0, 0.08)"}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
          <span style={{ fontWeight: 600 }}>Tinggi Konten Widget</span>
          <span
            style={{
              fontWeight: 700,
              color: isOverflowing ? "#e11d48" : "inherit",
            }}
          >
            ~{Math.round(estimatedH)}px{" "}
            <span style={{ fontWeight: 400, opacity: 0.7 }}>
              (Frame: {Math.round(element.frame.h)}px)
            </span>
          </span>
        </div>
        {isDifferent && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleFitToContent}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "6px",
              background: isOverflowing ? "#e11d48" : "#2563eb",
              color: "#ffffff",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "11.5px",
              transition: "opacity 0.15s ease",
            }}
          >
            ⚡ {isOverflowing ? "Sesuaikan Tinggi dengan Konten (Fit)" : "Reset Tinggi ke Konten"}
          </button>
        )}
      </div>

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
                onClick={() => {
                  setStyle({
                    variant: v.id,
                    radius: v.defaultRadius !== undefined ? v.defaultRadius : element.style.radius,
                  });
                  if (element.widgetType === "ornamentFrame") {
                    setProp("shape", v.id);
                  }
                }}
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
        {element.widgetType === "ornamentFrame" ? (
          <OrnamentFramePropsControl
            element={element}
            disabled={disabled}
            setProp={setProp}
          />
        ) : (
          Object.entries(definition.props).map(([name, spec]) => {
            if (name === "layout" && galleryLayoutFollowsVariant) return null;
            if (name === "title" && element.widgetType === "gallery") return null;
            const value = element.props[name];
            const bound = isBinding(value);
            const isBindable = spec.bindable !== false;
            const control = controlOf(spec);
            const fieldId = `insp-widget-${name}`;
            return (
              <div key={name} className={styles.panelStack} data-testid={`widget-prop-${name}`}>
                {isBindable && (
                  <>
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
                  </>
                )}
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
                ) : (element.widgetType === "photoFrame" || element.widgetType === "ornamentFrame") && name === "image" ? (
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
                    tokens={tokens}
                    onChange={(next) => setProp(name, next)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrnamentFramePropsControl({
  element,
  disabled,
  setProp,
}: {
  readonly element: WidgetElement;
  readonly disabled: boolean;
  readonly setProp: (name: string, value: unknown) => void;
}) {
  const props = (element.props ?? {}) as Record<string, unknown>;
  const image = props.image;
  const imageOpacity = typeof props.imageOpacity === "number" ? props.imageOpacity : 100;
  const fillOpacity = typeof props.fillOpacity === "number" ? props.fillOpacity : 100;
  const strokeWidth = typeof props.strokeWidth === "number" ? props.strokeWidth : 2;
  const doubleBorder = props.doubleBorder !== false;
  const innerGap = typeof props.innerGap === "number" ? props.innerGap : 12;
  const animationMode = typeof props.animationMode === "string" ? props.animationMode : "once";
  const animationSpeed = typeof props.animationSpeed === "string" ? props.animationSpeed : "normal";

  return (
    <div className={styles.panelStack} data-testid="ornament-frame-controls">
      {/* 1. Foto di Dalam Bentuk */}
      <div className={styles.panelStack} data-testid="widget-prop-image">
        <p className={styles.fieldLabel}>Foto di Dalam Bentuk (Opsional)</p>
        <PhotoFrameImageControl
          value={image}
          disabled={disabled}
          onChange={(img) => setProp("image", img)}
        />
        {Boolean(image) && (
          <div data-testid="widget-prop-imageOpacity" style={{ marginTop: 6 }}>
            <OpacityField
              id={`insp-widget-imageOpacity-${element.id}`}
              label="Transparansi Foto"
              value={imageOpacity / 100}
              disabled={disabled}
              onChange={(op) => setProp("imageOpacity", Math.round(op * 100))}
            />
          </div>
        )}
      </div>

      {/* 2. Latar Belakang */}
      <div className={styles.panelStack} data-testid="widget-prop-fillOpacity">
        <OpacityField
          id={`insp-widget-fillOpacity-${element.id}`}
          label="Transparansi Background"
          value={fillOpacity / 100}
          disabled={disabled}
          onChange={(op) => setProp("fillOpacity", Math.round(op * 100))}
        />
      </div>

      {/* 3. Garis & Border */}
      <div className={styles.panelStack}>
        <div data-testid="widget-prop-strokeWidth">
          <NumberField
            id={`insp-widget-strokeWidth-${element.id}`}
            label="Ketebalan Garis (px)"
            value={strokeWidth}
            min={1}
            max={12}
            step={1}
            decimals={0}
            disabled={disabled}
            onCommit={(val) => setProp("strokeWidth", val)}
          />
        </div>

        <div data-testid="widget-prop-doubleBorder">
          <label className={styles.fieldLabel} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 4 }}>
            <input
              id={`insp-widget-doubleBorder-${element.id}`}
              type="checkbox"
              checked={doubleBorder}
              disabled={disabled}
              onChange={(e) => setProp("doubleBorder", e.target.checked)}
            />
            <span>Garis Ganda (Double Border)</span>
          </label>
        </div>

        {doubleBorder && (
          <div data-testid="widget-prop-innerGap">
            <NumberField
              id={`insp-widget-innerGap-${element.id}`}
              label="Jarak Garis Dalam (px)"
              value={innerGap}
              min={2}
              max={40}
              step={1}
              decimals={0}
              disabled={disabled}
              onCommit={(val) => setProp("innerGap", val)}
            />
          </div>
        )}
      </div>

      {/* 4. Animasi Garis */}
      <div className={styles.panelStack}>
        <div data-testid="widget-prop-animationMode">
          <SelectField
            id={`insp-widget-animationMode-${element.id}`}
            label="Mode Animasi Garis"
            value={animationMode}
            disabled={disabled}
            options={[
              { value: "once", label: "1x Bergerak saat awal terlihat (Elegan)" },
              { value: "scroll", label: "Jalan saat di-scroll (Interaktif)" },
              { value: "loop", label: "Berjalan terus menerus (Loop)" },
              { value: "none", label: "Tanpa animasi (Statis)" },
            ]}
            onChange={(val) => setProp("animationMode", val)}
          />
        </div>

        {animationMode !== "none" && (
          <div data-testid="widget-prop-animationSpeed">
            <SelectField
              id={`insp-widget-animationSpeed-${element.id}`}
              label="Kecepatan Animasi"
              value={animationSpeed}
              disabled={disabled}
              options={[
                { value: "slow", label: "Lambat & Anggun (3.6s)" },
                { value: "normal", label: "Standar (2.2s)" },
                { value: "fast", label: "Cepat (1.5s)" },
              ]}
              onChange={(val) => setProp("animationSpeed", val)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FontPropControl({
  id,
  label,
  value,
  disabled,
  tokens,
  onChange,
}: {
  id: string;
  label: string;
  value: unknown;
  disabled: boolean;
  tokens?: ThemeTokens;
  onChange: (value: unknown) => void;
}) {
  const currentFont = typeof value === "string" ? value : "";

  const fontOptions: {
    value: string;
    label: string;
    group?: string;
    fontFamily?: string;
  }[] = [
    { value: "", label: "(Bawaan Desain / Gaya)", group: "Pilihan Default" },
  ];

  if (tokens?.fonts) {
    for (const [tokenKey, tokenVal] of Object.entries(tokens.fonts)) {
      if (tokenVal) {
        fontOptions.push({
          value: tokenVal,
          label: `${tokenKey} (${tokenVal})`,
          group: "Token Tema",
          fontFamily: tokenVal,
        });
      }
    }
  }

  for (const cat of FONT_CATEGORIES) {
    const fontsInCat = INVITATION_FONTS.filter((f) => f.category === cat.id);
    for (const f of fontsInCat) {
      fontOptions.push({
        value: f.family,
        label: f.name,
        group: cat.label,
        fontFamily: f.family,
      });
    }
  }

  if (
    currentFont &&
    !fontOptions.some((o) => o.value.toLowerCase() === currentFont.toLowerCase())
  ) {
    fontOptions.push({
      value: currentFont,
      label: currentFont,
      group: "Font Lainnya",
      fontFamily: currentFont,
    });
  }

  return (
    <div className={styles.panelStack}>
      <SelectField
        id={id}
        label={label}
        value={currentFont}
        options={fontOptions}
        disabled={disabled}
        onChange={(nextVal) => {
          if (nextVal) {
            void ensureFontLoaded(nextVal);
          }
          onChange(nextVal === "" ? undefined : nextVal);
        }}
      />
      {currentFont ? (
        <div
          className={styles.fontPreviewBadge}
          style={{ fontFamily: `"${currentFont}", sans-serif` }}
          title={`Pratinjau font: ${currentFont}`}
        >
          <span className={styles.fontPreviewName}>{currentFont}</span>
          <span className={styles.fontPreviewSample}>
            {label.toLowerCase().includes("nama") ? "Rama & Alya" : "Putra & Putri Tercinta"}
          </span>
        </div>
      ) : null}
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
  if (widgetType === "ornamentFrame") {
    const shape = getOrnamentShape(variant.id);
    return (
      <span
        className={styles.widgetVariantPreview}
        data-preview-widget={widgetType}
        data-preview-variant={variant.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 8px",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 400 260" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <path d={shape.fullPath} fill="none" stroke="currentColor" strokeWidth={18} />
          <path d={shape.innerFullPath} fill="none" stroke="currentColor" strokeWidth={8} opacity={0.6} />
        </svg>
      </span>
    );
  }

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
  tokens,
  onChange,
}: {
  id: string;
  control: NonNullable<WidgetPropDefinition["control"]>;
  spec: WidgetPropDefinition;
  value: unknown;
  disabled: boolean;
  tokens?: ThemeTokens;
  onChange: (value: unknown) => void;
}) {
  switch (control) {
    case "font": {
      return (
        <FontPropControl
          id={id}
          label={spec.label}
          value={value}
          disabled={disabled}
          tokens={tokens}
          onChange={onChange}
        />
      );
    }
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
          value={typeof value === "number" ? value : (spec.min ?? 1)}
          min={spec.min ?? 0}
          max={spec.max ?? 100}
          step={spec.step ?? 1}
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

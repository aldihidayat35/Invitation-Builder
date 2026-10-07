"use client";

import { useRef, useState } from "react";
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
import { extractYouTubeId } from "@/features/widgets/video-utils";
import { parseGifSource } from "@/features/widgets/runtime/GifWidget";
import { FONT_CATEGORIES, INVITATION_FONTS, ensureFontLoaded } from "@/lib/fonts";
import { BindingControl } from "./BindingControl";
import { GalleryItemsControl } from "./GalleryItemsControl";
import { GiftAccountsControl } from "./GiftAccountsControl";
import { PhotoFrameImageControl } from "./PhotoFrameImageControl";
import { TimelineEventsControl } from "./TimelineEventsControl";
import { WishesItemsControl } from "./WishesItemsControl";
import { CouplePersonControl } from "./CouplePersonControl";
import { GifLibrary, type GifItemPick } from "./gif/GifLibrary";
import { AssetLibrary } from "./AssetLibrary";
import { saveAssetFromUrlAction } from "@/features/assets/actions";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import { useEditorStore, useWorkspaceId } from "./EditorProvider";
import { IconCheck, IconGif, IconSparkle, IconZap } from "./icons";
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
            <IconZap size={13} />
            <span>{isOverflowing ? "Sesuaikan Tinggi dengan Konten (Fit)" : "Reset Tinggi ke Konten"}</span>
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
                  {active && <IconCheck size={11} style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 3 }} />}
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
        ) : element.widgetType === "video" ? (
          <VideoPropsControl
            element={element}
            disabled={disabled}
            setProp={setProp}
          />
        ) : element.widgetType === "gif" ? (
          <GifPropsControl
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

function VideoPropsControl({
  element,
  disabled,
  setProp,
}: {
  readonly element: WidgetElement;
  readonly disabled: boolean;
  readonly setProp: (name: string, value: unknown) => void;
}) {
  const workspaceId = useWorkspaceId();
  const props = (element.props ?? {}) as Record<string, unknown>;
  const rawUrl = typeof props.url === "string" ? props.url : "";
  const sourceType = (props.sourceType as string) || "youtube";
  const poster = props.poster;
  const caption = (props.caption as string) || "";
  const autoplayOnScroll = props.autoplayOnScroll === true;
  const loop = props.loop !== false;
  const muted = props.muted !== false;
  const showControls = props.showControls !== false;
  const aspectRatio = (props.aspectRatio as string) || "16:9";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectedYtId = extractYouTubeId(rawUrl);
  const [showGallery, setShowGallery] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadAssetFile(workspaceId, file);
      if (res.ok) {
        setProp("url", assetUrl(res.asset.id));
        setProp("assetId", res.asset.id);
        setProp("sourceType", "upload");
        if (!caption) {
          setProp("caption", file.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        const blobUrl = URL.createObjectURL(file);
        setProp("url", blobUrl);
        setProp("sourceType", "upload");
        if (!caption) {
          setProp("caption", file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.panelStack} data-testid="video-widget-controls">
      {/* 1. Sumber Video Tabs */}
      <div className={styles.panelStack}>
        <p className={styles.fieldLabel}>Sumber Video</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              sourceType === "youtube" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 6px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => {
              setProp("sourceType", "youtube");
              setShowGallery(false);
            }}
          >
            YouTube
          </button>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              sourceType === "upload" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 6px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => {
              setProp("sourceType", "upload");
              setShowGallery(true);
            }}
          >
            Galeri / File
          </button>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              sourceType === "direct" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 6px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => {
              setProp("sourceType", "direct");
              setShowGallery(false);
            }}
          >
            Link MP4
          </button>
        </div>
      </div>

      {/* Hidden file input for direct video upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        style={{ display: "none" }}
        disabled={disabled}
        onChange={handleFileUpload}
      />

      {/* 2. URL Input & YouTube Detection Feedback */}
      <div className={styles.panelStack} data-testid="widget-prop-url">
        <TextField
          id={`insp-widget-url-${element.id}`}
          label={
            sourceType === "youtube"
              ? "Link Video YouTube"
              : sourceType === "upload"
                ? "File Video / URL"
                : "URL Video Langsung (MP4 / WebM)"
          }
          value={rawUrl}
          disabled={disabled}
          placeholder={
            sourceType === "youtube"
              ? "https://www.youtube.com/watch?v=..."
              : "https://domain.com/video.mp4"
          }
          onCommit={(val) => setProp("url", val)}
        />

        {sourceType === "upload" && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              type="button"
              className={styles.primaryActionButton}
              style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
              disabled={disabled || uploading}
              onClick={() => setShowGallery((prev) => !prev)}
              data-testid="video-open-gallery-btn"
            >
              {showGallery ? "Tutup Galeri" : "🎬 Pilih dari Galeri"}
            </button>
            <button
              type="button"
              className={styles.widgetVariantCard}
              style={{ padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap" }}
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              data-testid="video-upload-file-btn"
            >
              {uploading ? "Mengunggah..." : "📁 Unggah File"}
            </button>
          </div>
        )}

        {showGallery && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "rgba(15, 23, 42, 0.45)",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
            data-testid="video-asset-library-container"
          >
            <AssetLibrary
              idPrefix="video-picker"
              pickLabel="Gunakan Video Ini"
              filterType="video"
              onPick={(asset) => {
                setProp("url", assetUrl(asset.id));
                setProp("assetId", asset.id);
                setProp("sourceType", "upload");
                if (!caption) {
                  setProp("caption", asset.filename.replace(/\.[^/.]+$/, ""));
                }
                setShowGallery(false);
              }}
              onUploaded={(asset) => {
                setProp("url", assetUrl(asset.id));
                setProp("assetId", asset.id);
                setProp("sourceType", "upload");
                if (!caption) {
                  setProp("caption", asset.filename.replace(/\.[^/.]+$/, ""));
                }
                setShowGallery(false);
              }}
            />
          </div>
        )}

        {detectedYtId ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              borderRadius: 6,
              fontSize: 12,
              color: "#ef4444",
              marginTop: 4,
            }}
          >
            <span style={{ fontWeight: 600 }}>✓ YouTube Terdeteksi</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>ID: {detectedYtId}</span>
          </div>
        ) : null}
      </div>

      {/* 3. Cover / Poster Thumbnail */}
      <div className={styles.panelStack} data-testid="widget-prop-poster">
        <p className={styles.fieldLabel}>Foto Sampul / Poster Video (Opsional)</p>
        <PhotoFrameImageControl
          value={poster}
          disabled={disabled}
          onChange={(img) => setProp("poster", img)}
        />
      </div>

      {/* 4. Judul / Keterangan */}
      <div className={styles.panelStack} data-testid="widget-prop-caption">
        <TextField
          id={`insp-widget-caption-${element.id}`}
          label="Judul / Keterangan Video"
          value={caption}
          disabled={disabled}
          placeholder="Momen Bahagia Rama & Sinta"
          onCommit={(val) => setProp("caption", val)}
        />
      </div>

      {/* 5. Rasio Video */}
      <div className={styles.panelStack} data-testid="widget-prop-aspectRatio">
        <SelectField
          id={`insp-widget-ratio-${element.id}`}
          label="Rasio Tampilan Video"
          value={aspectRatio}
          options={[
            { value: "16:9", label: "16:9 (Layar Lebar / YouTube Landscape)" },
            { value: "9:16", label: "9:16 (Vertikal / Reels & Shorts)" },
            { value: "4:3", label: "4:3 (Klasik)" },
            { value: "1:1", label: "1:1 (Persegi / Square)" },
          ]}
          disabled={disabled}
          onChange={(val) => setProp("aspectRatio", val)}
        />
      </div>

      {/* 6. Pengaturan Pemutaran (Autoplay, Loop, Muted, Controls) */}
      <div className={styles.panelStack} style={{ gap: 8 }}>
        <p className={styles.widgetSectionTitle}>Pengaturan Pemutaran</p>

        <label
          className={styles.fieldLabel}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={autoplayOnScroll}
            disabled={disabled}
            onChange={(e) => setProp("autoplayOnScroll", e.target.checked)}
          />
          <span>Putar otomatis saat di-scroll ke layar</span>
        </label>

        <label
          className={styles.fieldLabel}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={loop}
            disabled={disabled}
            onChange={(e) => setProp("loop", e.target.checked)}
          />
          <span>Putar ulang otomatis (Loop / Auto Replay)</span>
        </label>

        <label
          className={styles.fieldLabel}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={muted}
            disabled={disabled}
            onChange={(e) => setProp("muted", e.target.checked)}
          />
          <span>Bisu / Tanpa suara (Muted - Wajib untuk Autoplay)</span>
        </label>

        <label
          className={styles.fieldLabel}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={showControls}
            disabled={disabled}
            onChange={(e) => setProp("showControls", e.target.checked)}
          />
          <span>Tampilkan kontrol pemutar (Play/Pause, Durasi)</span>
        </label>
      </div>
    </div>
  );
}

function GifPropsControl({
  element,
  disabled,
  setProp,
}: {
  readonly element: WidgetElement;
  readonly disabled: boolean;
  readonly setProp: (name: string, value: unknown) => void;
}) {
  const workspaceId = useWorkspaceId();
  const props = (element.props ?? {}) as Record<string, unknown>;
  const url = typeof props.url === "string" ? props.url : "";
  const assetId = typeof props.assetId === "string" ? props.assetId : "";
  const caption = typeof props.caption === "string" ? props.caption : "";
  const fit = (props.fit as string) || "contain";
  const loop = props.loop !== false;
  const alignment = (props.alignment as string) || "center";

  const [showLibrary, setShowLibrary] = useState(false);
  const [savingToSystem, setSavingToSystem] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedSrc = parseGifSource(url, assetId) || "https://media.giphy.com/media/l41lO3n0gIuY7vM0E/giphy.gif";
  const isSavedInSystem = Boolean(assetId);

  // Upload local GIF file to workspace assets
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".gif") && file.type !== "image/gif") {
      setStatusMessage({ type: "error", text: "Hanya berkas format .gif yang didukung." });
      return;
    }

    try {
      const res = await uploadAssetFile(workspaceId, file);
      if (res.ok) {
        setProp("assetId", res.asset.id);
        setProp("url", undefined);
        if (!caption) {
          setProp("caption", file.name.replace(/\.[^/.]+$/, ""));
        }
        setStatusMessage({ type: "success", text: "Berkas GIF berhasil diunggah & disimpan ke sistem!" });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ type: "error", text: res.error });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Gagal mengunggah berkas GIF." });
    }
  };

  // Save current preset/external URL into workspace system assets for repeat reuse
  const handleSaveToSystem = async () => {
    if (!url || isSavedInSystem) return;
    setSavingToSystem(true);
    setStatusMessage(null);
    try {
      const res = await saveAssetFromUrlAction(
        workspaceId,
        url,
        caption ? `${caption}.gif` : "animasi-undangan.gif",
      );
      if (res.ok) {
        setProp("assetId", res.data.id);
        setStatusMessage({ type: "success", text: "Stiker berhasil disimpan ke sistem! Bisa dipakai berulang." });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ type: "error", text: res.error });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Gagal menyimpan stiker GIF ke sistem." });
    } finally {
      setSavingToSystem(false);
    }
  };

  const handlePickFromLibrary = (item: GifItemPick) => {
    if (item.assetId) {
      setProp("assetId", item.assetId);
      setProp("url", undefined);
    } else if (item.url) {
      setProp("url", item.url);
      setProp("assetId", undefined);
    }
    if (item.name && !caption) {
      setProp("caption", item.name);
    }
    setShowLibrary(false);
  };

  return (
    <div className={styles.panelStack} data-testid="gif-widget-controls">
      {/* 1. Preview Banner & Stiker Aktif */}
      <div className={styles.panelStack}>
        <p className={styles.fieldLabel}>Animasi / Stiker Aktif</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 10,
            background: "rgba(255, 240, 245, 0.4)",
            border: "1px solid rgba(244, 114, 182, 0.3)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              background: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedSrc}
              alt={caption || "GIF Preview"}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {isSavedInSystem ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#ecfdf5",
                    color: "#059669",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  ⭐ Tersimpan di Sistem
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#fef3c7",
                    color: "#b45309",
                    border: "1px solid #fde68a",
                  }}
                >
                  Stiker Koleksi / URL
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#1e293b",
              }}
              title={caption || "Animasi GIF"}
            >
              {caption || "Animasi GIF"}
            </p>
          </div>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              background: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
              border: statusMessage.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Action Buttons: Ganti Stiker, Simpan ke Sistem, Unggah */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            className={styles.primaryActionButton}
            style={{ width: "100%", justifyContent: "center" }}
            disabled={disabled}
            onClick={() => setShowLibrary((prev) => !prev)}
            data-testid="gif-open-library-btn"
          >
            <IconSparkle size={13} />
            <span>{showLibrary ? "Tutup Galeri Stiker" : "Pilih / Ganti Stiker GIF"}</span>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              type="button"
              className={styles.widgetVariantCard}
              style={{ padding: "7px 8px", fontSize: 11, textAlign: "center", justifyContent: "center" }}
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              data-testid="gif-upload-file-btn"
            >
              📁 Unggah .gif
            </button>

            {!isSavedInSystem && url ? (
              <button
                type="button"
                className={styles.widgetVariantCard}
                style={{
                  padding: "7px 8px",
                  fontSize: 11,
                  textAlign: "center",
                  justifyContent: "center",
                  borderColor: "#d97706",
                  color: "#92400e",
                }}
                disabled={disabled || savingToSystem}
                onClick={handleSaveToSystem}
                title="Simpan animasi ini ke koleksi aset sistem agar dapat digunakan berulang di undangan lain"
                data-testid="gif-save-system-btn"
              >
                {savingToSystem ? "Menyimpan..." : "💾 Simpan ke Sistem"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.widgetVariantCard}
                style={{ padding: "7px 8px", fontSize: 11, textAlign: "center", justifyContent: "center" }}
                disabled={disabled}
                onClick={() => {
                  setProp("url", "");
                  setProp("assetId", "");
                }}
                title="Gunakan stiker bawaan pernikahan"
              >
                🔄 Reset Bawaan
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".gif,image/gif"
          style={{ display: "none" }}
          disabled={disabled}
          onChange={handleFileUpload}
        />
      </div>

      {/* Embedded / Expandable Stiker Library Drawer */}
      {showLibrary && (
        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: 10,
            padding: 10,
            background: "#ffffff",
            maxHeight: 380,
            overflowY: "auto",
          }}
          data-testid="gif-embedded-library"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Koleksi Stiker &amp; Animasi</span>
            <button
              type="button"
              style={{
                fontSize: 11,
                border: "none",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
              }}
              onClick={() => setShowLibrary(false)}
            >
              ✕ Tutup
            </button>
          </div>
          <GifLibrary onPick={handlePickFromLibrary} disabled={disabled} />
        </div>
      )}

      {/* 2. Direct URL Input */}
      <div className={styles.panelStack} data-testid="widget-prop-url">
        <TextField
          id={`insp-widget-url-${element.id}`}
          label="Link / URL Animasi GIF"
          value={url}
          disabled={disabled}
          placeholder="https://media.giphy.com/media/.../giphy.gif"
          onCommit={(val) => {
            setProp("url", val);
            setProp("assetId", undefined);
          }}
        />
      </div>

      {/* 3. Judul / Keterangan (Caption) */}
      <div className={styles.panelStack} data-testid="widget-prop-caption">
        <TextField
          id={`insp-widget-caption-${element.id}`}
          label="Keterangan / Teks (Opsional)"
          value={caption}
          disabled={disabled}
          placeholder="Contoh: Sepasang Cincin Bahagia"
          onCommit={(val) => setProp("caption", val)}
        />
      </div>

      {/* 4. Kesesuaian Tampilan (Object Fit) */}
      <div className={styles.panelStack} data-testid="widget-prop-fit">
        <p className={styles.fieldLabel}>Kesesuaian Tampilan (Fit)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              fit === "contain" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 6px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => setProp("fit", "contain")}
            data-testid="gif-fit-contain"
          >
            Pas di Dalam (Contain)
          </button>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              fit === "cover" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 6px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => setProp("fit", "cover")}
            data-testid="gif-fit-cover"
          >
            Penuhi Bidang (Cover)
          </button>
        </div>
      </div>

      {/* 5. Perataan Posisi (Alignment) */}
      <div className={styles.panelStack} data-testid="widget-prop-alignment">
        <p className={styles.fieldLabel}>Posisi Perataan</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              alignment === "left" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 4px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => setProp("alignment", "left")}
            data-testid="gif-align-left"
          >
            Kiri
          </button>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              alignment === "center" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 4px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => setProp("alignment", "center")}
            data-testid="gif-align-center"
          >
            Tengah
          </button>
          <button
            type="button"
            className={[
              styles.widgetVariantCard,
              alignment === "right" && styles.widgetVariantCardActive,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ padding: "8px 4px", textAlign: "center", fontSize: 11 }}
            disabled={disabled}
            onClick={() => setProp("alignment", "right")}
            data-testid="gif-align-right"
          >
            Kanan
          </button>
        </div>
      </div>

      {/* 6. Putar Terus Menerus (Loop) */}
      <div className={styles.panelStack} data-testid="widget-prop-loop">
        <label
          className={styles.fieldLabel}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={loop}
            disabled={disabled}
            onChange={(e) => setProp("loop", e.target.checked)}
            data-testid="gif-loop-checkbox"
          />
          <span>Putar stiker terus menerus (Loop Animation)</span>
        </label>
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

  if (widgetType === "video") {
    return (
      <span
        className={styles.widgetVariantPreview}
        data-preview-widget={widgetType}
        data-preview-variant={variant.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px",
          background: variant.id === "vintage-polaroid" ? "#fdfbf7" : "#0f172a",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 65" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {variant.id === "cinematic-frame" && (
            <>
              <rect x="2" y="5" width="96" height="55" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
              <circle cx="50" cy="32.5" r="10" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="1" />
              <polygon points="48,28 55,32.5 48,37" fill="#ffffff" />
            </>
          )}
          {variant.id === "story-portrait" && (
            <>
              <rect x="30" y="2" width="40" height="61" rx="6" fill="#1e293b" stroke="#e11d48" strokeWidth="1.5" />
              <circle cx="50" cy="32.5" r="8" fill="#ffffff" />
              <polygon points="48,29 54,32.5 48,36" fill="#e11d48" />
            </>
          )}
          {variant.id === "vintage-polaroid" && (
            <>
              <rect x="15" y="2" width="70" height="61" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="20" y="6" width="60" height="42" rx="2" fill="#1e293b" />
              <circle cx="50" cy="27" r="8" fill="rgba(255,255,255,0.8)" />
              <polygon points="48,24 53,27 48,30" fill="#1e293b" />
              <line x1="30" y1="54" x2="70" y2="54" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
            </>
          )}
          {variant.id === "arch-luxury" && (
            <>
              <path d="M 20 60 L 20 25 A 30 30 0 0 1 80 25 L 80 60 Z" fill="#1e293b" stroke="#d4af37" strokeWidth="2" />
              <circle cx="50" cy="34" r="9" fill="#d4af37" stroke="#ffffff" strokeWidth="1" />
              <polygon points="48,30 54,34 48,38" fill="#ffffff" />
            </>
          )}
          {variant.id === "minimal-glass" && (
            <>
              <rect x="8" y="6" width="84" height="53" rx="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <circle cx="50" cy="32.5" r="9" fill="rgba(255,255,255,0.25)" stroke="#ffffff" strokeWidth="1" />
              <polygon points="48,29 54,32.5 48,36" fill="#ffffff" />
            </>
          )}
          {variant.id === "gold-ornament" && (
            <>
              <rect x="6" y="5" width="88" height="55" rx="4" fill="#1e293b" stroke="#d4af37" strokeWidth="1.5" />
              <rect x="10" y="9" width="80" height="47" rx="2" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="1" />
              <circle cx="50" cy="32.5" r="9" fill="#d4af37" />
              <polygon points="48,29 54,32.5 48,36" fill="#ffffff" />
            </>
          )}
        </svg>
      </span>
    );
  }

  if (widgetType === "gif") {
    return (
      <span
        className={styles.widgetVariantPreview}
        data-preview-widget={widgetType}
        data-preview-variant={variant.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px",
          background:
            variant.id === "vintage-frame"
              ? "#faf6ee"
              : variant.id === "gold-border"
                ? "#fffbf2"
                : "#ffffff",
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 65" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {variant.id === "clean" && (
            <>
              <rect x="15" y="8" width="70" height="49" rx="4" fill="none" stroke="#cbd5e1" strokeDasharray="3 3" />
              <text x="50" y="38" fontSize="18" textAnchor="middle" dominantBaseline="central">✨</text>
            </>
          )}
          {variant.id === "floating-badge" && (
            <>
              <rect x="12" y="6" width="76" height="53" rx="8" fill="#ffffff" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
              <circle cx="50" cy="32.5" r="14" fill="#fdf2f8" />
              <text x="50" y="37" fontSize="13" textAnchor="middle" dominantBaseline="central">🎀</text>
            </>
          )}
          {variant.id === "gold-border" && (
            <>
              <rect x="10" y="5" width="80" height="55" rx="6" fill="#fffdfa" stroke="#d4af37" strokeWidth="2" />
              <rect x="14" y="9" width="72" height="47" rx="4" fill="none" stroke="rgba(212,175,55,0.4)" strokeDasharray="3 2" />
              <text x="50" y="37" fontSize="13" textAnchor="middle" dominantBaseline="central">💍</text>
            </>
          )}
          {variant.id === "neon-glow" && (
            <>
              <rect x="12" y="6" width="76" height="53" rx="8" fill="#ffffff" stroke="#ec4899" strokeWidth="2" />
              <circle cx="50" cy="32.5" r="14" fill="#fce7f3" stroke="#f472b6" />
              <text x="50" y="38" fontSize="13" textAnchor="middle" dominantBaseline="central">💖</text>
            </>
          )}
          {variant.id === "vintage-frame" && (
            <>
              <rect x="10" y="5" width="80" height="55" rx="4" fill="#faf6ee" stroke="#8b5a2b" strokeWidth="3" />
              <rect x="15" y="10" width="70" height="45" fill="none" stroke="#8b5a2b" strokeWidth="1" />
              <text x="50" y="37" fontSize="13" textAnchor="middle" dominantBaseline="central">🕊️</text>
            </>
          )}
          {variant.id === "soft-pill" && (
            <>
              <rect x="10" y="14" width="80" height="37" rx="18.5" fill="#ffffff" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
              <text x="50" y="37" fontSize="13" textAnchor="middle" dominantBaseline="central">🎉</text>
            </>
          )}
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

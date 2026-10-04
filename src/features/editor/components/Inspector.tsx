"use client";

import type { ReactNode } from "react";
import type { Element } from "@/lib/schema";
import { findElement, findSection, type ReorderMode } from "../core/ops";
import { resolveColor, elementLabel, elementTypeLabel } from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import {
  ColorField,
  FieldRow,
  NumberField,
  OpacityField,
  SelectField,
  TextField,
  type ColorValue,
} from "./fields";
import {
  ElementIcon,
  IconBackward,
  IconBringFront,
  IconCopy,
  IconCursor,
  IconEyeOff,
  IconForward,
  IconLayers,
  IconLock,
  IconOpacity,
  IconPlus,
  IconReplay,
  IconSection,
  IconSendBack,
  IconSparkle,
  IconTrash,
  IconUnlock,
} from "./icons";
import { ImagePanel } from "./ImagePanel";
import { PanelSection } from "./PanelSection";
import { WidgetPanel } from "./WidgetPanel";
import { AnimationPanel } from "./AnimationPanel";
import { SectionTransitionControl } from "./SectionTransitionControl";
import styles from "./editor.module.css";

import { FONT_CATEGORIES, INVITATION_FONTS, ensureFontLoaded } from "@/lib/fonts";

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({
  value: w,
  label: String(w),
}));
const ALIGNS = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
  { value: "justify", label: "Rata" },
] as const;

type TextElement = Extract<Element, { type: "text" }>;
type ShapeElement = Extract<Element, { type: "shape" }>;

export function Inspector() {
  const doc = useEditor(selectDoc);
  const selectedIds = useEditor((s) => s.selectedIds);
  const activeSectionId = useEditor((s) => s.activeSectionId);
  const readOnly = useEditor((s) => s.readOnly);

  let body;
  if (selectedIds.length === 1) {
    const loc = findElement(doc, selectedIds[0]!);
    body = loc ? (
      <ElementPanel element={loc.element} readOnly={readOnly} sectionId={loc.section.id} />
    ) : null;
  } else if (selectedIds.length > 1) {
    body = <MultiPanel ids={selectedIds} readOnly={readOnly} />;
  } else if (activeSectionId && findSection(doc, activeSectionId)) {
    body = <SectionPanel sectionId={activeSectionId} readOnly={readOnly} />;
  } else {
    body = (
      <div className={styles.emptyState}>
        <span className={styles.emptyStateIcon}>
          <IconCursor size={22} />
        </span>
        <p className={styles.emptyStateTitle}>Belum ada yang dipilih</p>
        <p className={styles.muted}>Pilih section atau elemen untuk mengatur propertinya.</p>
      </div>
    );
  }

  return (
    <aside className={styles.inspector} aria-label="Inspector" data-testid="inspector">
      {body}
    </aside>
  );
}

/** Title card at the top of the inspector. */
function InspectorHeader({
  icon,
  eyebrow,
  title,
  badge,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  badge?: ReactNode;
}) {
  return (
    <header className={styles.inspHeader}>
      <span className={styles.inspHeaderIcon}>{icon}</span>
      <div className={styles.inspHeaderText}>
        <span className={styles.inspEyebrow}>{eyebrow}</span>
        <h2 className={styles.inspTitle} title={title}>
          {title}
        </h2>
      </div>
      {badge}
    </header>
  );
}

// ------------------------------------------------------------------ section

function SectionPanel({ sectionId, readOnly }: { sectionId: string; readOnly: boolean }) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const section = findSection(doc, sectionId);
  if (!section) return null;
  const tokens = doc.design.tokens;
  const act = () => store.getState();

  return (
    <div className={styles.inspStack} data-testid="section-inspector">
      <InspectorHeader
        icon={<IconSection size={18} />}
        eyebrow="Section"
        title={section.name || "Tanpa nama"}
        badge={section.visible ? null : <span className={styles.badge}>Disembunyikan</span>}
      />

      <PanelSection id="insp-section-general" title="Umum">
        <TextField
          id="insp-section-name"
          label="Nama"
          value={section.name ?? ""}
          disabled={readOnly}
          maxLength={120}
          onCommit={(name) => act().patchSection(sectionId, { name })}
        />
        <label className={styles.checkRow}>
          <input
            id="insp-section-visible"
            type="checkbox"
            checked={section.visible}
            disabled={readOnly}
            onChange={(e) => act().patchSection(sectionId, { visible: e.target.checked })}
          />
          Tampilkan section saat publish
        </label>
      </PanelSection>

      <PanelSection id="insp-section-layout" title="Ukuran & latar">
        <NumberField
          id="insp-section-height"
          label="Tinggi (px)"
          value={section.baseHeight}
          min={100}
          max={4000}
          disabled={readOnly}
          onCommit={(baseHeight) => act().patchSection(sectionId, { baseHeight })}
        />
        <ColorField
          id="insp-section-bg"
          label="Warna latar"
          value={section.background.color}
          resolvedHex={resolveColor(section.background.color, tokens, "#ffffff")}
          tokens={tokens.colors}
          allowNone
          disabled={readOnly}
          onChange={(color) => act().patchSection(sectionId, { background: { color } })}
        />
        <SelectField
          id="insp-section-overflow"
          label="Konten di luar batas"
          value={section.overflow}
          disabled={readOnly}
          options={[
            { value: "hidden", label: "Dipotong (hidden)" },
            { value: "visible", label: "Terlihat (visible)" },
          ]}
          onChange={(overflow) => act().patchSection(sectionId, { overflow })}
        />
      </PanelSection>

      <PanelSection
        id="insp-section-transition"
        title="Transisi scroll section"
        icon={<IconSparkle size={13} />}
        count={section.transition && section.transition.type !== "none" ? 1 : undefined}
      >
        <SectionTransitionControl section={section} readOnly={readOnly} />
      </PanelSection>

      <PanelSection id="insp-section-anim" title="Animasi elemen section">
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("dib:replay-animation", { detail: { sectionId } }),
              );
            }
          }}
          title="Putar ulang semua animasi di section ini"
          data-testid="replay-section-btn"
        >
          <IconReplay size={13} />
          Putar ulang animasi elemen
        </button>
        <p className={styles.muted}>Preview animasi elemen diputar langsung di artboard.</p>
      </PanelSection>

      <p className={styles.footHint}>
        Urutan section = urutan scroll publik. Lebar kanonik 390 px.
      </p>
    </div>
  );
}


// ------------------------------------------------------------------ actions

function ElementActions({ ids, readOnly }: { ids: readonly string[]; readOnly: boolean }) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const elements = ids
    .map((id) => findElement(doc, id)?.element)
    .filter((e): e is Element => e !== undefined);
  const allLocked = elements.length > 0 && elements.every((e) => e.locked);
  const act = () => store.getState();
  const reorder = (mode: ReorderMode, label: string, testId: string, icon: ReactNode) => (
    <button
      type="button"
      className={styles.iconButton}
      disabled={readOnly}
      data-testid={testId}
      aria-label={label}
      title={label}
      onClick={() => act().reorder(mode, ids)}
    >
      {icon}
    </button>
  );

  return (
    <div className={styles.actionsCard}>
      <div className={styles.actionGrid}>
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly}
          data-testid="action-duplicate"
          title="Duplikat (Ctrl+D)"
          onClick={() => act().duplicateSelected()}
        >
          <IconCopy size={15} />
          <span>Duplikat</span>
        </button>
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly}
          aria-pressed={allLocked}
          data-testid="action-lock"
          title={allLocked ? "Buka kunci" : "Kunci"}
          onClick={() => act().setLocked(ids, !allLocked)}
        >
          {allLocked ? <IconUnlock size={15} /> : <IconLock size={15} />}
          <span>{allLocked ? "Buka kunci" : "Kunci"}</span>
        </button>
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly}
          data-testid="action-hide"
          title="Sembunyikan"
          aria-label="Sembunyikan"
          onClick={() => act().setVisible(ids, false)}
        >
          <IconEyeOff size={15} />
          <span>Sembunyi</span>
        </button>
        <button
          type="button"
          className={`${styles.actionTile} ${styles.danger}`}
          disabled={readOnly}
          data-testid="action-delete"
          title="Hapus (Delete)"
          onClick={() => act().deleteSelected()}
        >
          <IconTrash size={15} />
          <span>Hapus</span>
        </button>
      </div>
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>
          <IconLayers size={13} />
          Urutan layer
        </span>
        <div className={styles.iconGroup} role="group" aria-label="Urutan layer">
          {reorder("front", "Paling depan", "action-front", <IconBringFront size={15} />)}
          {reorder("forward", "Maju satu", "action-forward", <IconForward size={15} />)}
          {reorder("backward", "Mundur satu", "action-backward", <IconBackward size={15} />)}
          {reorder("back", "Paling belakang", "action-back", <IconSendBack size={15} />)}
        </div>
      </div>
    </div>
  );
}

function MultiPanel({ ids, readOnly }: { ids: readonly string[]; readOnly: boolean }) {
  const store = useEditorStore();
  return (
    <div className={styles.inspStack} data-testid="multi-inspector">
      <InspectorHeader
        icon={<IconLayers size={18} />}
        eyebrow="Pilihan ganda"
        title={`${ids.length} elemen dipilih`}
      />
      <ElementActions ids={ids} readOnly={readOnly} />
      <PanelSection
        id="insp-multi-opacity-section"
        title="Transparansi & Opasitas"
        icon={<IconOpacity size={14} />}
      >
        <OpacityField
          id="insp-multi-opacity"
          value={1}
          disabled={readOnly}
          onChange={(percent) => store.getState().patchStyle(ids, { opacity: percent })}
        />
      </PanelSection>
      <p className={styles.footHint}>Geser atau ubah ukuran langsung di artboard.</p>
    </div>
  );
}

// ------------------------------------------------------------------ element

function ElementPanel({
  element,
  readOnly,
  sectionId,
}: {
  element: Element;
  readOnly: boolean;
  sectionId: string;
}) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const tokens = doc.design.tokens;
  const act = () => store.getState();
  const locked = element.locked;
  const disabled = readOnly || locked;
  const frame = element.frame;
  const opacity = (element.style as { opacity?: number }).opacity ?? 1;
  const id = element.id;
  const typeLabel = elementTypeLabel(element);

  return (
    <div className={styles.inspStack} data-testid="element-inspector" data-element-id={id}>
      <InspectorHeader
        icon={<ElementIcon element={element} size={18} />}
        eyebrow={typeLabel}
        title={elementLabel(element)}
        badge={
          locked ? (
            <span className={styles.badge}>
              <IconLock size={11} /> Terkunci
            </span>
          ) : null
        }
      />

      <ElementActions ids={[id]} readOnly={readOnly} />

      <PanelSection id="insp-general" title="Umum">
        <TextField
          id="insp-name"
          label="Nama layer"
          value={element.name ?? ""}
          disabled={readOnly}
          maxLength={120}
          onCommit={(name) => act().renameElement(id, name)}
        />
      </PanelSection>

      <PanelSection id="insp-transform" title="Posisi & ukuran">
        <div className={styles.grid2}>
          <NumberField
            id="insp-x"
            label="X"
            value={frame.x}
            disabled={disabled}
            step={1}
            onCommit={(x) => act().patchFrame(id, { x })}
          />
          <NumberField
            id="insp-y"
            label="Y"
            value={frame.y}
            disabled={disabled}
            step={1}
            onCommit={(y) => act().patchFrame(id, { y })}
          />
          <NumberField
            id="insp-w"
            label="Lebar"
            value={frame.w}
            min={1}
            disabled={disabled}
            onCommit={(w) => act().patchFrame(id, { w })}
          />
          <NumberField
            id="insp-h"
            label="Tinggi"
            value={frame.h}
            min={1}
            disabled={disabled}
            onCommit={(h) => act().patchFrame(id, { h })}
          />
          <NumberField
            id="insp-rotation"
            label="Rotasi (°)"
            value={frame.rotation}
            min={-360}
            max={360}
            disabled={disabled}
            onCommit={(rotation) => act().patchFrame(id, { rotation })}
          />
        </div>
      </PanelSection>

      <PanelSection
        id="insp-opacity-section"
        title="Transparansi & Opasitas"
        icon={<IconOpacity size={14} />}
        actions={
          Math.round(opacity * 100) < 100 ? (
            <span className={styles.badge}>{Math.round(opacity * 100)}%</span>
          ) : null
        }
      >
        <OpacityField
          id="insp-opacity"
          value={opacity}
          disabled={disabled}
          onChange={(newOpacity) => act().patchStyle([id], { opacity: newOpacity })}
        />
      </PanelSection>

      {element.type === "text" ? (
        <PanelSection id="insp-text" title="Teks & tipografi">
          <TextPanel element={element} readOnly={readOnly} tokens={tokens} />
        </PanelSection>
      ) : null}
      {element.type === "shape" ? (
        <PanelSection id="insp-shape" title="Bentuk">
          <ShapePanel element={element} readOnly={readOnly} tokens={tokens} />
        </PanelSection>
      ) : null}
      {element.type === "image" ? (
        <PanelSection id="insp-image" title="Gambar">
          <ImagePanel element={element} readOnly={readOnly} />
        </PanelSection>
      ) : null}
      {element.type === "widget" ? (
        <PanelSection id="insp-widget" title={`Pengaturan ${typeLabel.toLowerCase()}`}>
          <WidgetPanel element={element} readOnly={readOnly} />
        </PanelSection>
      ) : null}

      <PanelSection
        id="insp-animation"
        title="Animasi"
        icon={<IconSparkle size={13} />}
        count={element.animations?.enter ? 1 : undefined}
      >
        <AnimationPanel element={element} readOnly={readOnly} sectionId={sectionId} />
      </PanelSection>
    </div>
  );
}

function TextPanel({
  element,
  readOnly,
  tokens,
}: {
  element: TextElement;
  readOnly: boolean;
  tokens: { colors: Record<string, string>; fonts: Record<string, string> };
}) {
  const store = useEditorStore();
  const act = () => store.getState();
  const id = element.id;
  const s = element.style;
  const segments = element.content.segments;

  const setSegments = (next: TextElement["content"]["segments"]) =>
    act().patchElement(
      id,
      (el) => ({ ...(el as TextElement), content: { segments: next } }),
      "segments",
    );

  const fontName = typeof s.fontFamily === "string" ? s.fontFamily : "";
  const fontToken = typeof s.fontFamily === "object" ? s.fontFamily.token : "";
  const fontValue = fontToken ? `token:${fontToken}` : fontName || "";
  const fontOptions: Array<{
    value: string;
    label: string;
    group?: string;
    fontFamily?: string;
  }> = [{ value: "", label: "Bawaan sistem", group: "Dasar" }];

  if (Object.keys(tokens.fonts).length > 0) {
    for (const [tokenKey, tokenVal] of Object.entries(tokens.fonts)) {
      fontOptions.push({
        value: `token:${tokenKey}`,
        label: `${tokenKey} (${tokenVal})`,
        group: "Token Tema",
        fontFamily: tokenVal,
      });
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
    fontName &&
    !INVITATION_FONTS.some((f) => f.family.toLowerCase() === fontName.toLowerCase())
  ) {
    fontOptions.push({
      value: fontName,
      label: fontName,
      group: "Font Lainnya",
      fontFamily: fontName,
    });
  }

  return (
    <>
      {segments.map((segment, index) =>
        "bind" in segment ? (
          <div key={index} className={styles.bindingChip} data-testid="binding-chip">
            <span>Binding</span>
            <code>{segment.bind}</code>
            <button
              type="button"
              className={styles.chipRemove}
              disabled={readOnly || segments.length <= 1}
              aria-label={`Hapus segmen binding ${segment.bind}`}
              onClick={() => setSegments(segments.filter((_, i) => i !== index))}
            >
              x
            </button>
          </div>
        ) : (
          <div key={index} className={styles.segmentRow}>
            <TextField
              id={`insp-text-${index}`}
              label={segments.length > 1 ? `Segmen ${index + 1}` : "Isi teks"}
              value={segment.text}
              multiline
              disabled={readOnly}
              maxLength={2000}
              onCommit={(text) =>
                setSegments(segments.map((seg, i) => (i === index ? { text } : seg)))
              }
            />
            {segments.length > 1 ? (
              <button
                type="button"
                className={styles.chipRemove}
                disabled={readOnly}
                aria-label={`Hapus segmen ${index + 1}`}
                onClick={() => setSegments(segments.filter((_, i) => i !== index))}
              >
                x
              </button>
            ) : null}
          </div>
        ),
      )}
      <button
        type="button"
        className={styles.ghostButton}
        disabled={readOnly || segments.length >= 50}
        onClick={() => setSegments([...segments, { text: " " }])}
      >
        <IconPlus size={13} />
        Segmen teks
      </button>

      <p className={styles.groupLabel}>Tipografi</p>
      <SelectField
        id="insp-font"
        label="Font"
        value={fontValue}
        options={fontOptions}
        disabled={readOnly}
        onChange={(value) => {
          if (value === "") {
            act().patchStyle([id], { fontFamily: undefined });
          } else if (value.startsWith("token:")) {
            const token = value.slice(6);
            act().patchStyle([id], { fontFamily: { token } });
            const resolved = tokens.fonts[token];
            if (resolved) void ensureFontLoaded(resolved);
          } else {
            act().patchStyle([id], { fontFamily: value });
            void ensureFontLoaded(value);
          }
        }}
      />
      {fontName ? (
        <div
          className={styles.fontPreviewBadge}
          style={{ fontFamily: `"${fontName}", sans-serif` }}
          title={`Pratinjau font: ${fontName}`}
        >
          <span className={styles.fontPreviewName}>{fontName}</span>
          <span className={styles.fontPreviewSample}>The Wedding of Romeo &amp; Juliet</span>
        </div>
      ) : null}
      <div className={styles.grid2}>
        <NumberField
          id="insp-font-size"
          label="Ukuran"
          value={s.fontSize}
          min={1}
          max={400}
          disabled={readOnly}
          onCommit={(fontSize) => act().patchStyle([id], { fontSize })}
        />
        <SelectField
          id="insp-font-weight"
          label="Tebal"
          value={s.fontWeight}
          options={WEIGHTS}
          disabled={readOnly}
          onChange={(fontWeight) => act().patchStyle([id], { fontWeight })}
        />
        <NumberField
          id="insp-line-height"
          label="Tinggi baris"
          value={s.lineHeight}
          min={0.5}
          max={4}
          step={0.1}
          disabled={readOnly}
          onCommit={(lineHeight) => act().patchStyle([id], { lineHeight })}
        />
        <NumberField
          id="insp-letter-spacing"
          label="Jarak huruf"
          value={s.letterSpacing}
          min={-20}
          max={100}
          step={0.5}
          disabled={readOnly}
          onCommit={(letterSpacing) => act().patchStyle([id], { letterSpacing })}
        />
      </div>
      <FieldRow label="Rata teks">
        <div className={styles.segmented} role="group" aria-label="Rata teks">
          {ALIGNS.map((a) => (
            <button
              key={a.value}
              type="button"
              className={styles.segmentedButton}
              aria-pressed={s.textAlign === a.value}
              disabled={readOnly}
              data-testid={`align-${a.value}`}
              onClick={() => act().patchStyle([id], { textAlign: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </FieldRow>
      <ColorField
        id="insp-text-color"
        label="Warna"
        value={s.color as ColorValue}
        resolvedHex={resolveColor(s.color, tokens)}
        tokens={tokens.colors}
        disabled={readOnly}
        onChange={(color) => color !== undefined && act().patchStyle([id], { color })}
      />
    </>
  );
}

function ShapePanel({
  element,
  readOnly,
  tokens,
}: {
  element: ShapeElement;
  readOnly: boolean;
  tokens: { colors: Record<string, string> };
}) {
  const store = useEditorStore();
  const act = () => store.getState();
  const id = element.id;
  const s = element.style;
  const isLine = element.shapeType === "line";

  return (
    <>
      {!isLine ? (
        <ColorField
          id="insp-fill"
          label="Isi"
          value={s.fill as ColorValue | undefined}
          resolvedHex={resolveColor(s.fill, tokens)}
          tokens={tokens.colors}
          allowNone
          disabled={readOnly}
          onChange={(fill) => act().patchStyle([id], { fill })}
        />
      ) : null}
      <ColorField
        id="insp-stroke-color"
        label={isLine ? "Warna garis" : "Garis tepi"}
        value={s.stroke?.color as ColorValue | undefined}
        resolvedHex={resolveColor(s.stroke?.color, tokens)}
        tokens={tokens.colors}
        allowNone={!isLine}
        disabled={readOnly}
        onChange={(color) =>
          act().patchStyle([id], {
            stroke: color === undefined ? undefined : { color, width: s.stroke?.width ?? 1 },
          })
        }
      />
      <div className={styles.grid2}>
        {s.stroke ? (
          <NumberField
            id="insp-stroke-width"
            label="Tebal garis"
            value={s.stroke.width}
            min={isLine ? 0.5 : 0}
            max={200}
            step={0.5}
            disabled={readOnly}
            onCommit={(width) =>
              act().patchStyle([id], { stroke: { color: s.stroke!.color, width } })
            }
          />
        ) : null}
        {element.shapeType === "rectangle" ? (
          <NumberField
            id="insp-radius"
            label="Radius sudut"
            value={s.radius}
            min={0}
            max={1000}
            disabled={readOnly}
            onCommit={(radius) => act().patchStyle([id], { radius })}
          />
        ) : null}
      </div>
    </>
  );
}

"use client";

import { findElement, findSection, type ReorderMode } from "../core/ops";
import { resolveColor, elementLabel, elementTypeLabel } from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import {
  ColorField,
  FieldRow,
  NumberField,
  SelectField,
  TextField,
  type ColorValue,
} from "./fields";
import { ImagePanel } from "./ImagePanel";
import { WidgetPanel } from "./WidgetPanel";
import { AnimationPanel } from "./AnimationPanel";
import styles from "./editor.module.css";
import type { Element } from "@/lib/schema";

const FONT_PRESETS = ["Playfair Display", "Lora", "Inter", "Georgia", "Times New Roman", "Arial"];
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
    body = <p className={styles.muted}>Pilih section atau elemen untuk mengatur propertinya.</p>;
  }

  return (
    <aside className={styles.inspector} aria-label="Inspector" data-testid="inspector">
      {body}
    </aside>
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
    <div className={styles.panelStack} data-testid="section-inspector">
      <h2 className={styles.panelHeading}>Section</h2>
      <TextField
        id="insp-section-name"
        label="Nama"
        value={section.name ?? ""}
        disabled={readOnly}
        maxLength={120}
        onCommit={(name) => act().patchSection(sectionId, { name })}
      />
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
        label="Latar"
        value={section.background.color}
        resolvedHex={resolveColor(section.background.color, tokens, "#ffffff")}
        tokens={tokens.colors}
        allowNone
        disabled={readOnly}
        onChange={(color) => act().patchSection(sectionId, { background: { color } })}
      />
      <SelectField
        id="insp-section-overflow"
        label="Overflow"
        value={section.overflow}
        disabled={readOnly}
        options={[
          { value: "hidden", label: "Dipotong (hidden)" },
          { value: "visible", label: "Terlihat (visible)" },
        ]}
        onChange={(overflow) => act().patchSection(sectionId, { overflow })}
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
      <div className={styles.toolGroup} style={{ marginTop: 8 }}>
        <button
          type="button"
          className={styles.toolButton}
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
          ⟳ Replay Animasi Section
        </button>
      </div>
      <p className={styles.muted}>Urutan section = urutan scroll publik. Lebar kanonik 390 px.</p>
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
  const reorder = (mode: ReorderMode, label: string, testId: string) => (
    <button
      type="button"
      className={styles.smallButton}
      disabled={readOnly}
      data-testid={testId}
      onClick={() => act().reorder(mode, ids)}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.smallButton}
        disabled={readOnly}
        aria-pressed={allLocked}
        data-testid="action-lock"
        onClick={() => act().setLocked(ids, !allLocked)}
      >
        {allLocked ? "Buka kunci" : "Kunci"}
      </button>
      <button
        type="button"
        className={styles.smallButton}
        disabled={readOnly}
        data-testid="action-hide"
        onClick={() => act().setVisible(ids, false)}
      >
        Sembunyikan
      </button>
      <button
        type="button"
        className={styles.smallButton}
        disabled={readOnly}
        data-testid="action-duplicate"
        onClick={() => act().duplicateSelected()}
      >
        Duplikat
      </button>
      <button
        type="button"
        className={`${styles.smallButton} ${styles.danger}`}
        disabled={readOnly}
        data-testid="action-delete"
        onClick={() => act().deleteSelected()}
      >
        Hapus
      </button>
      <div className={styles.zorder} role="group" aria-label="Urutan layer">
        {reorder("front", "Ke depan", "action-front")}
        {reorder("forward", "Maju", "action-forward")}
        {reorder("backward", "Mundur", "action-backward")}
        {reorder("back", "Ke belakang", "action-back")}
      </div>
    </div>
  );
}

function MultiPanel({ ids, readOnly }: { ids: readonly string[]; readOnly: boolean }) {
  const store = useEditorStore();
  return (
    <div className={styles.panelStack} data-testid="multi-inspector">
      <h2 className={styles.panelHeading}>{ids.length} elemen dipilih</h2>
      <NumberField
        id="insp-multi-opacity"
        label="Opacity (%)"
        value={100}
        min={0}
        max={100}
        disabled={readOnly}
        onCommit={(percent) => store.getState().patchStyle(ids, { opacity: percent / 100 })}
      />
      <ElementActions ids={ids} readOnly={readOnly} />
      <p className={styles.muted}>Geser atau ubah ukuran langsung di artboard.</p>
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

  return (
    <div className={styles.panelStack} data-testid="element-inspector" data-element-id={id}>
      <h2 className={styles.panelHeading}>
        {elementTypeLabel(element)}
        {locked ? <span className={styles.badge}>Terkunci</span> : null}
      </h2>
      <TextField
        id="insp-name"
        label="Nama layer"
        value={element.name ?? ""}
        disabled={readOnly}
        maxLength={120}
        onCommit={(name) => act().renameElement(id, name)}
      />

      <h3 className={styles.subHeading}>Transform</h3>
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
          label="Rotasi (deg)"
          value={frame.rotation}
          min={-360}
          max={360}
          disabled={disabled}
          onCommit={(rotation) => act().patchFrame(id, { rotation })}
        />
        <NumberField
          id="insp-opacity"
          label="Opacity (%)"
          value={Math.round(opacity * 100)}
          min={0}
          max={100}
          disabled={readOnly}
          onCommit={(p) => act().patchStyle([id], { opacity: p / 100 })}
        />
      </div>

      {element.type === "text" ? (
        <TextPanel element={element} readOnly={readOnly} tokens={tokens} />
      ) : null}
      {element.type === "shape" ? (
        <ShapePanel element={element} readOnly={readOnly} tokens={tokens} />
      ) : null}
      {element.type === "image" ? <ImagePanel element={element} readOnly={readOnly} /> : null}
      {element.type === "widget" ? <WidgetPanel element={element} readOnly={readOnly} /> : null}

      <AnimationPanel element={element} readOnly={readOnly} sectionId={sectionId} />

      <ElementActions ids={[id]} readOnly={readOnly} />
      <p className={styles.muted}>Layer: {elementLabel(element)}</p>
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
  const fontOptions = [
    { value: "", label: "Bawaan sistem" },
    ...Object.keys(tokens.fonts).map((t) => ({ value: `token:${t}`, label: `Token: ${t}` })),
    ...FONT_PRESETS.map((f) => ({ value: f, label: f })),
  ];
  if (fontName && !FONT_PRESETS.includes(fontName))
    fontOptions.push({ value: fontName, label: fontName });

  return (
    <>
      <h3 className={styles.subHeading}>Teks</h3>
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
        className={styles.smallButton}
        disabled={readOnly || segments.length >= 50}
        onClick={() => setSegments([...segments, { text: " " }])}
      >
        + Segmen teks
      </button>

      <SelectField
        id="insp-font"
        label="Font"
        value={fontValue}
        options={fontOptions}
        disabled={readOnly}
        onChange={(value) => {
          if (value === "") act().patchStyle([id], { fontFamily: undefined });
          else if (value.startsWith("token:")) {
            act().patchStyle([id], { fontFamily: { token: value.slice(6) } });
          } else act().patchStyle([id], { fontFamily: value });
        }}
      />
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
      <h3 className={styles.subHeading}>Bentuk</h3>
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
    </>
  );
}

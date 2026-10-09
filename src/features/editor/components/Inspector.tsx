"use client";

import { useState, type ReactNode } from "react";
import type { Element } from "@/lib/schema";
import { variableKeySchema, isBindingCompatible } from "@/lib/schema";
import { findElement, findSection, uniqueVariableKey, type ReorderMode } from "../core/ops";
import { resolveColor, elementLabel, elementTypeLabel } from "../core/display";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { BaseBackgroundControl } from "./BaseBackgroundControl";
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
  IconClipboardCopy,
  IconClipboardPaste,
  IconDuplicate,
  IconEyeOff,
  IconForward,
  IconGroup,
  IconLayers,
  IconLock,
  IconOpacity,
  IconPencil,
  IconPlus,
  IconReplay,
  IconSection,
  IconSendBack,
  IconSparkle,
  IconTrash,
  IconUngroup,
  IconUnlock,
  IconVariable,
} from "./icons";
import { ImagePanel } from "./ImagePanel";
import { PanelSection } from "./PanelSection";
import { WidgetPanel } from "./WidgetPanel";
import { AnimationPanel } from "./AnimationPanel";
import { SectionTransitionControl } from "./SectionTransitionControl";
import { ShadowControl } from "./ShadowControl";
import { usePanelSectionOrder } from "./usePanelSectionOrder";
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
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const selectedIds = useEditor((s) => s.selectedIds);
  const activeSectionId = useEditor((s) => s.activeSectionId);
  const readOnly = useEditor((s) => s.readOnly);

  let body;
  if (selectedIds.length === 1) {
    const loc = findElement(doc, selectedIds[0]!);
    body = loc ? (
      <ElementPanel
        key={loc.element.id}
        element={loc.element}
        readOnly={readOnly}
        sectionId={loc.section.id}
      />
    ) : null;
  } else if (selectedIds.length > 1) {
    body = <MultiPanel key={selectedIds.join(",")} ids={selectedIds} readOnly={readOnly} />;
  } else if (activeSectionId && findSection(doc, activeSectionId)) {
    body = <SectionPanel key={activeSectionId} sectionId={activeSectionId} readOnly={readOnly} />;
  } else {
    const openingSection = doc.sections.find((s) => s.isOpening);
    body = (
      <>
        <InspectorHeader
          icon={<IconSparkle size={18} />}
          eyebrow="Pengaturan Template"
          title="Pengaturan Dokumen"
        />
        <PanelSection
          id="insp-doc-opening"
          title="Cover Opening (Section 0)"
          icon={<IconSparkle size={13} />}
          count={openingSection ? 1 : undefined}
          defaultOpen={false}
        >
          {openingSection ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p className={styles.muted} style={{ fontSize: "0.8rem", margin: 0 }}>
                Dokumen memiliki <strong>Section 0 (Cover Opening)</strong>. Section ini akan menjadi layar pembuka penuh yang dapat dikustomisasi, dan harus diklik untuk masuk ke Section 1.
              </p>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => store.getState().setActiveSection(openingSection.id)}
                data-testid="focus-opening-section-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <IconPencil size={13} />
                <span>Edit Canvas Section Opening (#0)</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p className={styles.muted} style={{ fontSize: "0.8rem", margin: 0 }}>
                Belum ada Section Opening khusus. Anda dapat menambahkan canvas Section 0 sebagai cover pembuka custom.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={readOnly}
                onClick={() => store.getState().addOpeningSection()}
                data-testid="add-opening-section-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <IconPlus size={13} />
                <span>Tambah Canvas Opening (Section 0)</span>
              </button>
            </div>
          )}
        </PanelSection>
        <PanelSection
          id="insp-doc-base-bg"
          title="Latar Layar (Screen BG)"
          icon={<IconSparkle size={13} />}
          count={doc.design.background ? 1 : undefined}
        >
          <BaseBackgroundControl readOnly={readOnly} />
        </PanelSection>
      </>
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

export const DEFAULT_SECTION_INSPECTOR_ORDER = [
  "insp-section-general",
  "insp-section-layout",
  "insp-section-transition",
  "insp-section-anim",
  "insp-section-actions",
] as const;

export type SectionInspectorSectionId = (typeof DEFAULT_SECTION_INSPECTOR_ORDER)[number];

function SectionPanel({ sectionId, readOnly }: { sectionId: string; readOnly: boolean }) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const clipboard = useEditor((s) => s.clipboard);
  const section = findSection(doc, sectionId);
  const { order: sectionOrder, getDragProps } = usePanelSectionOrder(
    "dib:section-inspector-order",
    DEFAULT_SECTION_INSPECTOR_ORDER,
    readOnly,
  );
  if (!section) return null;
  const tokens = doc.design.tokens;
  const act = () => store.getState();

  const renderSection = (id: SectionInspectorSectionId) => {
    switch (id) {
      case "insp-section-general":
        return (
          <PanelSection
            key="insp-section-general"
            id="insp-section-general"
            title="Umum"
            scopeKey={sectionId}
            defaultOpen={false}
            dragProps={getDragProps("insp-section-general")}
          >
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
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: section.isOpening ? "rgba(217, 119, 6, 0.12)" : "rgba(255, 255, 255, 0.03)",
                borderRadius: 6,
                border: section.isOpening ? "1px solid rgba(217, 119, 6, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <label className={styles.checkRow} style={{ margin: 0, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <input
                  id="insp-section-opening"
                  type="checkbox"
                  checked={Boolean(section.isOpening)}
                  disabled={readOnly}
                  onChange={() => act().toggleSectionOpening(sectionId)}
                  data-testid="section-opening-toggle"
                />
                <IconSparkle size={13} />
                <span>Jadikan Section Opening (Section 0 / Cover)</span>
              </label>
              <p className={styles.muted} style={{ fontSize: "0.72rem", marginTop: 4, marginBottom: 0 }}>
                {section.isOpening
                  ? "Section ini adalah Cover Pembuka (#0). Pengunjung harus mengklik layar untuk membukanya dan memicu animasi masuk Section 1."
                  : "Jadikan section ini sebagai kanvas cover pembuka beranimasi sebelum masuk ke isi undangan."}
              </p>
            </div>
          </PanelSection>
        );

      case "insp-section-layout":
        return (
          <PanelSection
            key="insp-section-layout"
            id="insp-section-layout"
            title="Ukuran & latar"
            scopeKey={sectionId}
            defaultOpen={false}
            dragProps={getDragProps("insp-section-layout")}
          >
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
        );

      case "insp-section-transition":
        return (
          <PanelSection
            key="insp-section-transition"
            id="insp-section-transition"
            title="Transisi scroll section"
            icon={<IconSparkle size={13} />}
            count={section.transition && section.transition.type !== "none" ? 1 : undefined}
            scopeKey={sectionId}
            defaultOpen={false}
            dragProps={getDragProps("insp-section-transition")}
          >
            <SectionTransitionControl section={section} readOnly={readOnly} />
          </PanelSection>
        );

      case "insp-section-anim":
        return (
          <PanelSection
            key="insp-section-anim"
            id="insp-section-anim"
            title="Animasi elemen section"
            scopeKey={sectionId}
            defaultOpen={false}
            dragProps={getDragProps("insp-section-anim")}
          >
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
        );

      case "insp-section-actions":
        return (
          <PanelSection
            key="insp-section-actions"
            id="insp-section-actions"
            title="Tindakan Section"
            scopeKey={sectionId}
            defaultOpen={false}
            dragProps={getDragProps("insp-section-actions")}
          >
            <div className={styles.actionGrid}>
              <button
                type="button"
                className={styles.actionTile}
                disabled={readOnly}
                data-testid="section-duplicate-btn"
                title="Duplikat section ini beserta semua elemennya"
                onClick={() => act().duplicateSection(sectionId)}
              >
                <IconSection size={15} />
                <span>Duplikat</span>
              </button>
              <button
                type="button"
                className={styles.actionTile}
                disabled={readOnly || clipboard.length === 0}
                data-testid="section-paste-btn"
                title={
                  clipboard.length === 0
                    ? "Clipboard kosong"
                    : `Tempel ${clipboard.length} elemen ke section ini (Ctrl+V)`
                }
                onClick={() => act().paste({ sectionId })}
              >
                <IconClipboardPaste size={15} />
                <span>Tempel ({clipboard.length})</span>
              </button>
            </div>
          </PanelSection>
        );
    }
  };

  return (
    <div className={styles.inspStack} data-testid="section-inspector">
      <InspectorHeader
        icon={<IconSection size={18} />}
        eyebrow="Section"
        title={section.name || "Tanpa nama"}
        badge={section.visible ? null : <span className={styles.badge}>Disembunyikan</span>}
      />

      {sectionOrder.map((id) => renderSection(id))}

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
  const clipboard = useEditor((s) => s.clipboard);
  const elements = ids
    .map((id) => findElement(doc, id)?.element)
    .filter((e): e is Element => e !== undefined);
  const allLocked = elements.length > 0 && elements.every((e) => e.locked);
  const canGroup = ids.length >= 2;
  const hasGroup = elements.some((e) => Boolean(e.groupId));
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
        {canGroup && (
          <button
            type="button"
            className={styles.actionTile}
            disabled={readOnly}
            data-testid="action-group"
            title="Grup elemen (Ctrl+G)"
            onClick={() => act().groupSelected()}
          >
            <IconGroup size={15} />
            <span>Grup</span>
          </button>
        )}
        {hasGroup && (
          <button
            type="button"
            className={styles.actionTile}
            disabled={readOnly}
            data-testid="action-ungroup"
            title="Pisahkan grup (Ctrl+Shift+G)"
            onClick={() => act().ungroupSelected()}
          >
            <IconUngroup size={15} />
            <span>Pisahkan</span>
          </button>
        )}
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly}
          data-testid="action-duplicate"
          title="Duplikat (Ctrl+D)"
          onClick={() => act().duplicateSelected()}
        >
          <IconDuplicate size={15} />
          <span>Duplikat</span>
        </button>
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly}
          data-testid="action-copy"
          title="Salin (Ctrl+C)"
          onClick={() => act().copySelected()}
        >
          <IconClipboardCopy size={15} />
          <span>Salin</span>
        </button>
        <button
          type="button"
          className={styles.actionTile}
          disabled={readOnly || clipboard.length === 0}
          data-testid="action-paste"
          title={clipboard.length === 0 ? "Clipboard kosong" : `Tempel ${clipboard.length} elemen (Ctrl+V)`}
          onClick={() => act().paste()}
        >
          <IconClipboardPaste size={15} />
          <span>Tempel</span>
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
  const doc = useEditor(selectDoc);
  const tokens = doc.design.tokens;

  const locations = ids
    .map((id) => findElement(doc, id))
    .filter((loc): loc is NonNullable<typeof loc> => Boolean(loc));
  const elements = locations.map((l) => l.element);
  const firstEl = elements[0];
  const sectionId = locations[0]?.section.id;

  const isUnifiedGroup =
    elements.length > 0 &&
    Boolean(firstEl?.groupId) &&
    elements.every((el) => el.groupId === firstEl?.groupId);

  const sharedGroupId = isUnifiedGroup ? firstEl?.groupId : null;
  const groupName = (isUnifiedGroup ? firstEl?.groupName : null) || "Grup";

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(groupName);

  if (isUnifiedGroup && sharedGroupId && firstEl && sectionId) {
    return (
      <div className={styles.inspStack} data-testid="group-inspector">
        <div className={styles.groupHeaderWrapper}>
          <div className={styles.groupHeaderTop}>
            <div className={styles.groupHeaderIcon}>
              <IconGroup size={18} />
            </div>
            <div className={styles.groupHeaderTitles}>
              <span className={styles.eyebrow}>Grup Elemen</span>
              {isEditingGroupName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (groupNameInput.trim()) {
                      store.getState().renameGroup(sharedGroupId, groupNameInput.trim());
                    }
                    setIsEditingGroupName(false);
                  }}
                  className={styles.groupRenameForm}
                >
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    onBlur={() => {
                      if (groupNameInput.trim()) {
                        store.getState().renameGroup(sharedGroupId, groupNameInput.trim());
                      }
                      setIsEditingGroupName(false);
                    }}
                    autoFocus
                    className={styles.groupRenameInput}
                    maxLength={120}
                  />
                </form>
              ) : (
                <div className={styles.groupTitleRow}>
                  <h3 className={styles.title}>{groupName}</h3>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Ubah nama grup"
                    onClick={() => {
                      setGroupNameInput(groupName);
                      setIsEditingGroupName(true);
                    }}
                  >
                    <IconPencil size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <span className={styles.groupMetaBadge}>
            {elements.length} elemen di dalam grup
          </span>
        </div>

        <ElementActions ids={ids} readOnly={readOnly} />

        <PanelSection
          id="insp-group-anim-section"
          title="Animasi Grup (Satu Animasi Bersama)"
          icon={<IconSparkle size={14} />}
          defaultOpen={true}
        >
          <AnimationPanel
            element={firstEl}
            readOnly={readOnly}
            sectionId={sectionId}
          />
        </PanelSection>

        <PanelSection
          id="insp-group-opacity-section"
          title="Transparansi & Opasitas Grup"
          icon={<IconOpacity size={14} />}
          defaultOpen={false}
        >
          <OpacityField
            id="insp-group-opacity"
            value={(firstEl.style as { opacity?: number }).opacity ?? 1}
            disabled={readOnly}
            onChange={(percent) => store.getState().patchGroupStyle(sharedGroupId, { opacity: percent })}
          />
        </PanelSection>

        <PanelSection
          id="insp-group-shadow-section"
          title="Efek Bayangan (Shadow) Grup"
          icon={<IconSparkle size={14} />}
          defaultOpen={false}
        >
          <ShadowControl
            tokens={tokens}
            disabled={readOnly}
            onChange={(shadow) => store.getState().patchGroupStyle(sharedGroupId, { shadow })}
          />
        </PanelSection>

        <PanelSection
          id="insp-group-members-section"
          title="Elemen dalam Grup"
          icon={<IconLayers size={14} />}
          count={elements.length}
          defaultOpen={false}
        >
          <div className={styles.groupMembersList}>
            {elements.map((el) => (
              <button
                key={el.id}
                type="button"
                className={styles.groupMemberRow}
                onClick={() => store.getState().selectElements([el.id])}
                title={`Pilih elemen ${elementLabel(el)}`}
              >
                <span className={styles.groupMemberIcon}>
                  <ElementIcon element={el} size={14} />
                </span>
                <span className={styles.groupMemberName}>{elementLabel(el)}</span>
                <span className={styles.groupMemberType}>{elementTypeLabel(el)}</span>
              </button>
            ))}
          </div>
        </PanelSection>

        <p className={styles.footHint}>Geser atau ubah ukuran langsung di artboard.</p>
      </div>
    );
  }

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
        defaultOpen={false}
      >
        <OpacityField
          id="insp-multi-opacity"
          value={1}
          disabled={readOnly}
          onChange={(percent) => store.getState().patchStyle(ids, { opacity: percent })}
        />
      </PanelSection>
      <PanelSection
        id="insp-multi-shadow-section"
        title="Efek Bayangan (Shadow)"
        icon={<IconSparkle size={14} />}
        defaultOpen={false}
      >
        <ShadowControl
          tokens={tokens}
          disabled={readOnly}
          onChange={(shadow) => store.getState().patchStyle(ids, { shadow })}
        />
      </PanelSection>
      <p className={styles.footHint}>Geser atau ubah ukuran langsung di artboard.</p>
    </div>
  );
}

// ------------------------------------------------------------------ element

export const DEFAULT_ELEMENT_PANEL_ORDER = [
  "insp-general",
  "insp-transform",
  "insp-content",
  "insp-opacity-section",
  "insp-shadow-section",
  "insp-animation",
] as const;

export type ElementPanelSectionId = (typeof DEFAULT_ELEMENT_PANEL_ORDER)[number];

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

  const { order: sectionOrder, getDragProps } = usePanelSectionOrder(
    "dib:element-inspector-order",
    DEFAULT_ELEMENT_PANEL_ORDER,
    readOnly,
  );

  const renderContentSection = () => {
    if (element.type === "text") {
      return (
        <PanelSection
          key="insp-text"
          id="insp-text"
          title="Teks & tipografi"
          scopeKey={id}
          defaultOpen={false}
          dragProps={getDragProps("insp-content")}
        >
          <TextPanel element={element} readOnly={readOnly} tokens={tokens} />
        </PanelSection>
      );
    }
    if (element.type === "shape") {
      return (
        <PanelSection
          key="insp-shape"
          id="insp-shape"
          title="Bentuk"
          scopeKey={id}
          defaultOpen={false}
          dragProps={getDragProps("insp-content")}
        >
          <ShapePanel element={element} readOnly={readOnly} tokens={tokens} />
        </PanelSection>
      );
    }
    if (element.type === "image") {
      return (
        <PanelSection
          key="insp-image"
          id="insp-image"
          title="Gambar"
          scopeKey={id}
          defaultOpen={false}
          dragProps={getDragProps("insp-content")}
        >
          <ImagePanel element={element} readOnly={readOnly} />
        </PanelSection>
      );
    }
    if (element.type === "widget") {
      return (
        <PanelSection
          key="insp-widget"
          id="insp-widget"
          title={`Pengaturan ${typeLabel.toLowerCase()}`}
          scopeKey={id}
          defaultOpen={false}
          dragProps={getDragProps("insp-content")}
        >
          <WidgetPanel element={element} readOnly={readOnly} tokens={tokens} />
        </PanelSection>
      );
    }
    return null;
  };

  const renderSection = (sectionKey: ElementPanelSectionId) => {
    switch (sectionKey) {
      case "insp-general":
        return (
          <PanelSection
            key="insp-general"
            id="insp-general"
            title="Umum"
            scopeKey={id}
            defaultOpen={false}
            dragProps={getDragProps("insp-general")}
          >
            <TextField
              id="insp-name"
              label="Nama layer"
              value={element.name ?? ""}
              disabled={readOnly}
              maxLength={120}
              onCommit={(name) => act().renameElement(id, name)}
            />
          </PanelSection>
        );

      case "insp-transform":
        return (
          <PanelSection
            key="insp-transform"
            id="insp-transform"
            title="Posisi & ukuran"
            scopeKey={id}
            defaultOpen={false}
            dragProps={getDragProps("insp-transform")}
          >
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
        );

      case "insp-opacity-section":
        return (
          <PanelSection
            key="insp-opacity-section"
            id="insp-opacity-section"
            title="Transparansi & Opasitas"
            icon={<IconOpacity size={14} />}
            scopeKey={id}
            defaultOpen={false}
            dragProps={getDragProps("insp-opacity-section")}
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
        );

      case "insp-shadow-section":
        return (
          <PanelSection
            key="insp-shadow-section"
            id="insp-shadow-section"
            title="Efek Bayangan (Shadow)"
            icon={<IconSparkle size={13} />}
            count={element.style.shadow ? 1 : undefined}
            scopeKey={id}
            defaultOpen={false}
            dragProps={getDragProps("insp-shadow-section")}
          >
            <ShadowControl
              shadow={element.style.shadow}
              tokens={tokens}
              disabled={disabled}
              onChange={(shadow) => act().patchStyle([id], { shadow })}
            />
          </PanelSection>
        );

      case "insp-content":
        return renderContentSection();

      case "insp-animation":
        return (
          <PanelSection
            key="insp-animation"
            id="insp-animation"
            title="Animasi"
            icon={<IconSparkle size={13} />}
            count={
              (element.animations?.enter ? 1 : 0) +
              (element.animations?.attention ? 1 : 0) +
              (element.animations?.exit ? 1 : 0) || undefined
            }
            scopeKey={id}
            defaultOpen={false}
            dragProps={getDragProps("insp-animation")}
          >
            <AnimationPanel element={element} readOnly={readOnly} sectionId={sectionId} />
          </PanelSection>
        );
    }
  };

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

      {element.groupId && (
        <div className={styles.elementGroupInfo} data-testid="element-group-info">
          <div className={styles.elementGroupInfoLeft}>
            <IconGroup size={14} />
            <span>
              Grup: <strong>{element.groupName || "Grup"}</strong>
            </span>
          </div>
          <div className={styles.elementGroupInfoActions}>
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() => {
                const loc = findElement(doc, element.id);
                if (loc) {
                  const groupMemberIds = loc.section.elements
                    .filter((e) => e.groupId === element.groupId)
                    .map((e) => e.id);
                  store.getState().selectElements(groupMemberIds);
                }
              }}
              title="Pilih seluruh elemen dalam grup ini"
            >
              Pilih Seluruh Grup
            </button>
            <button
              type="button"
              className={styles.miniBtn}
              disabled={readOnly}
              onClick={() => store.getState().ungroupSelected()}
              title="Keluarkan elemen dari grup"
            >
              Pisahkan
            </button>
          </div>
        </div>
      )}

      <ElementActions ids={[id]} readOnly={readOnly} />

      {sectionOrder.map((sectionKey) => renderSection(sectionKey))}
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
  const doc = useEditor(selectDoc);
  const id = element.id;
  const s = element.style;
  const segments = element.content.segments;

  const [convertingIndex, setConvertingIndex] = useState<number | null>(null);
  const [convertMode, setConvertMode] = useState<"create" | "pick">("create");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDefault, setNewDefault] = useState("");
  const [selectedExistingKey, setSelectedExistingKey] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  // Available text-compatible variables in document + runtime
  const declaredTextVars = doc.variables.filter((v) => isBindingCompatible("text", v.type));
  const declaredKeys = new Set(doc.variables.map((v) => v.key));

  const setSegments = (next: TextElement["content"]["segments"]) =>
    act().patchElement(
      id,
      (el) => ({ ...(el as TextElement), content: { segments: next } }),
      "segments",
    );

  const startConvert = (index: number, initialText: string) => {
    setConvertingIndex(index);
    setConvertMode("create");
    setConvertError(null);
    const suggestedKey = uniqueVariableKey(doc, "custom.text");
    setNewKey(suggestedKey);
    setNewLabel("Teks Dinamis");
    setNewDefault(initialText);
    setSelectedExistingKey(declaredTextVars[0]?.key ?? "guest.name");
  };

  const handleApplyConvert = (index: number) => {
    if (convertMode === "create") {
      const key = newKey.trim();
      if (!variableKeySchema.safeParse(key).success) {
        setConvertError("Kunci harus berupa dot path yang valid (mis. tamu.nama atau teks.pesan)");
        return;
      }
      if (declaredKeys.has(key)) {
        setConvertError("Kunci variabel ini sudah ada, gunakan kunci lain.");
        return;
      }
      act().addVariable({
        key,
        label: newLabel.trim() || "Teks Dinamis",
        type: "text",
        default: newDefault,
      });
      act().bindTextSegment(id, index, key, newDefault);
      setConvertingIndex(null);
    } else {
      if (!selectedExistingKey) {
        setConvertError("Pilih variabel terlebih dahulu.");
        return;
      }
      const existing = doc.variables.find((v) => v.key === selectedExistingKey);
      const fallback =
        (existing && "default" in existing && typeof existing.default === "string"
          ? existing.default
          : "") || newDefault;
      act().bindTextSegment(id, index, selectedExistingKey, fallback);
      setConvertingIndex(null);
    }
  };

  const handleInsertVariable = () => {
    const key = uniqueVariableKey(doc, "custom.text");
    const label = "Teks Dinamis Baru";
    act().addVariable({
      key,
      label,
      type: "text",
      default: "Teks baru",
    });
    setSegments([...segments, { bind: key, fallback: "Teks baru" }]);
  };

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
      {segments.map((segment, index) => {
        if ("bind" in segment) {
          const declaredVar = doc.variables.find((v) => v.key === segment.bind);
          const isGuest = segment.bind === "guest.name";
          const varLabel = declaredVar?.label ?? (isGuest ? "Nama Tamu Undangan" : segment.bind);
          const currentValue =
            (declaredVar && "default" in declaredVar && typeof declaredVar.default === "string"
              ? declaredVar.default
              : "") || (typeof segment.fallback === "string" ? segment.fallback : "");

          return (
            <div key={index} className={styles.variableSegmentCard} data-testid="binding-chip">
              <div className={styles.variableCardHeader}>
                <div className={styles.variableBadgeGroup}>
                  <span className={styles.variableBadge}>
                    <IconVariable size={11} /> Variabel Dinamis
                  </span>
                  <code className={styles.variableKeyBadge}>{segment.bind}</code>
                </div>
                <button
                  type="button"
                  className={styles.variableUnbindBtn}
                  disabled={readOnly}
                  onClick={() => act().unbindTextSegment(id, index, currentValue)}
                  title="Ubah kembali menjadi teks biasa (lepas variabel)"
                >
                  Teks Biasa
                </button>
              </div>

              <div className={styles.variableCardBody}>
                <span className={styles.variableMetaLabel}>{varLabel}</span>

                {declaredVar ? (
                  <>
                    <FieldRow
                      label="Isi Data Dinamis (Nilai Bawaan)"
                      htmlFor={`var-dyn-val-${index}`}
                    >
                      <textarea
                        id={`var-dyn-val-${index}`}
                        className={styles.textarea}
                        rows={2}
                        disabled={readOnly}
                        value={currentValue}
                        placeholder="Ketik data dinamis yang akan tampil..."
                        onChange={(e) => {
                          const val = e.target.value;
                          act().updateVariable(segment.bind, { default: val });
                          act().bindTextSegment(id, index, segment.bind, val);
                        }}
                      />
                    </FieldRow>
                    <p className={styles.variableHint}>
                      Data dinamis ini langsung muncul di artboard dan pratinjau undangan.
                    </p>
                  </>
                ) : isGuest ? (
                  <>
                    <FieldRow
                      label="Teks Cadangan (Fallback jika nama tamu kosong)"
                      htmlFor={`var-guest-fallback-${index}`}
                    >
                      <input
                        id={`var-guest-fallback-${index}`}
                        className={styles.input}
                        disabled={readOnly}
                        value={
                          typeof segment.fallback === "string"
                            ? segment.fallback
                            : "Bapak / Ibu / Saudara(i)"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          act().bindTextSegment(id, index, segment.bind, val);
                        }}
                      />
                    </FieldRow>
                    <p className={styles.variableHint}>
                      Secara otomatis diisi nama tamu penerima dari tautan undangan.
                    </p>
                  </>
                ) : (
                  <FieldRow label="Nilai Cadangan (Fallback)" htmlFor={`var-fb-${index}`}>
                    <input
                      id={`var-fb-${index}`}
                      className={styles.input}
                      disabled={readOnly}
                      value={typeof segment.fallback === "string" ? segment.fallback : ""}
                      onChange={(e) =>
                        act().bindTextSegment(id, index, segment.bind, e.target.value)
                      }
                    />
                  </FieldRow>
                )}

                {segments.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      disabled={readOnly}
                      onClick={() => setSegments(segments.filter((_, i) => i !== index))}
                    >
                      <IconTrash size={12} /> Hapus Segmen
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={index} className={styles.segmentCard}>
            <div className={styles.segmentRow}>
              <TextField
                id={`insp-text-${index}`}
                label={segments.length > 1 ? `Segmen ${index + 1} (Teks Biasa)` : "Isi Teks Biasa"}
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
                  <IconTrash size={13} />
                </button>
              ) : null}
            </div>

            {!readOnly && (
              <div className={styles.variableConvertRow}>
                <button
                  type="button"
                  className={styles.variableConvertBtn}
                  onClick={() => {
                    if (convertingIndex === index) {
                      setConvertingIndex(null);
                    } else {
                      startConvert(index, segment.text);
                    }
                  }}
                  title="Jadikan teks biasa ini sebagai variabel dinamis"
                >
                  <IconVariable size={13} />
                  <span>Jadikan Variabel Dinamis</span>
                </button>
              </div>
            )}

            {convertingIndex === index && !readOnly && (
              <div className={styles.variableConvertBox}>
                <div className={styles.variableConvertTabs}>
                  <button
                    type="button"
                    className={styles.variableConvertTab}
                    data-active={convertMode === "create"}
                    onClick={() => {
                      setConvertMode("create");
                      setConvertError(null);
                    }}
                  >
                    Buat Variabel Baru
                  </button>
                  <button
                    type="button"
                    className={styles.variableConvertTab}
                    data-active={convertMode === "pick"}
                    onClick={() => {
                      setConvertMode("pick");
                      setConvertError(null);
                    }}
                  >
                    Pilih yang Sudah Ada
                  </button>
                </div>

                {convertError && <p className={styles.errorHint}>{convertError}</p>}

                {convertMode === "create" ? (
                  <>
                    <FieldRow label="Label Variabel" htmlFor={`var-label-${index}`}>
                      <input
                        id={`var-label-${index}`}
                        className={styles.input}
                        value={newLabel}
                        placeholder="Contoh: Nama Tamu, Ucapan"
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Kunci Variabel (dot path)" htmlFor={`var-key-${index}`}>
                      <input
                        id={`var-key-${index}`}
                        className={styles.input}
                        value={newKey}
                        placeholder="mis. custom.text"
                        onChange={(e) => setNewKey(e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Nilai Dinamis Bawaan" htmlFor={`var-def-${index}`}>
                      <textarea
                        id={`var-def-${index}`}
                        className={styles.textarea}
                        rows={2}
                        value={newDefault}
                        onChange={(e) => setNewDefault(e.target.value)}
                      />
                    </FieldRow>
                  </>
                ) : (
                  <FieldRow label="Pilih Variabel" htmlFor={`var-pick-${index}`}>
                    <select
                      id={`var-pick-${index}`}
                      className={styles.input}
                      value={selectedExistingKey}
                      onChange={(e) => setSelectedExistingKey(e.target.value)}
                    >
                      <optgroup label="Konteks Tamu (Runtime)">
                        <option value="guest.name">Nama Tamu Undangan (guest.name)</option>
                      </optgroup>
                      {declaredTextVars.length > 0 && (
                        <optgroup label="Variabel Terdaftar">
                          {declaredTextVars.map((v) => (
                            <option key={v.key} value={v.key}>
                              {v.label} ({v.key})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </FieldRow>
                )}

                <div className={styles.variableConvertActions}>
                  <button
                    type="button"
                    className={styles.variableCancelBtn}
                    onClick={() => setConvertingIndex(null)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={styles.variableSubmitBtn}
                    onClick={() => handleApplyConvert(index)}
                  >
                    <IconVariable size={12} />
                    {convertMode === "create" ? "Buat & Sambungkan" : "Sambungkan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className={styles.segmentBtnGroup}>
        <button
          type="button"
          className={styles.ghostButton}
          disabled={readOnly || segments.length >= 50}
          onClick={() => setSegments([...segments, { text: " " }])}
        >
          <IconPlus size={13} />
          Segmen teks
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          disabled={readOnly || segments.length >= 50}
          onClick={handleInsertVariable}
          title="Sisipkan variabel dinamis baru"
        >
          <IconVariable size={13} />
          + Variabel Dinamis
        </button>
      </div>

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

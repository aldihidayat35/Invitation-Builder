"use client";

import { useState, type ReactNode } from "react";
import { defaultWidgetRegistry } from "@/features/widgets";
import { elementLabel, elementTypeLabel } from "../core/display";
import { findSection, type ElementKind } from "../core/ops";
import { AssetLibrary } from "./AssetLibrary";
import { BaseBackgroundControl } from "./BaseBackgroundControl";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import {
  ElementIcon,
  IconCircle,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconImages,
  IconLayers,
  IconLine,
  IconLock,
  IconPlus,
  IconSection,
  IconSparkle,
  IconSquare,
  IconText,
  IconUnlock,
  WidgetIcon,
} from "./icons";
import { PanelSection } from "./PanelSection";
import styles from "./editor.module.css";

const PALETTE: ReadonlyArray<{ kind: ElementKind; label: string; icon: ReactNode }> = [
  { kind: "text", label: "Teks", icon: <IconText /> },
  { kind: "rectangle", label: "Persegi", icon: <IconSquare /> },
  { kind: "circle", label: "Lingkaran", icon: <IconCircle /> },
  { kind: "line", label: "Garis", icon: <IconLine /> },
  { kind: "decoration", label: "Dekorasi", icon: <IconSparkle /> },
];

export function LeftPanel() {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const readOnly = useEditor((s) => s.readOnly);
  const activeSectionId = useEditor((s) => s.activeSectionId);
  const selectedIds = useEditor((s) => s.selectedIds);

  const section = activeSectionId ? findSection(doc, activeSectionId) : undefined;
  // Layers are listed top-first: the last element in the array is rendered on top.
  const layers = section ? [...section.elements].reverse() : [];
  const noSection = !section;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; placement: "above" | "below" } | null>(
    null,
  );

  return (
    <aside className={styles.side} aria-label="Panel kiri">
      <div className={styles.sideHeader}>
        <span className={styles.sideHeaderTitle}>Komponen</span>
        <span className={styles.sideHeaderHint}>
          {section ? `Ke: ${section.name || "Section aktif"}` : "Pilih section dulu"}
        </span>
      </div>

      <PanelSection id="left-elements" title="Tambah elemen" icon={<IconPlus size={14} />}>
        <div className={styles.tileGrid}>
          {PALETTE.map(({ kind, label, icon }) => (
            <button
              key={kind}
              type="button"
              className={styles.tile}
              data-testid={`add-${kind}`}
              disabled={readOnly || noSection}
              title={`Tambah ${label.toLowerCase()}`}
              onClick={() => store.getState().addElement(kind)}
            >
              <span className={styles.tileIcon}>{icon}</span>
              <span className={styles.tileLabel}>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.ghostButton}
          data-testid="add-section"
          disabled={readOnly}
          onClick={() => store.getState().addSection()}
        >
          <IconSection size={14} />
          Section baru
        </button>
      </PanelSection>

      <PanelSection id="left-widgets" title="Widget" icon={<IconSparkle size={14} />}>
        <div className={styles.tileGrid}>
          {defaultWidgetRegistry.list().map((widget) => (
            <button
              key={widget.type}
              type="button"
              className={styles.tile}
              data-testid={`add-widget-${widget.type}`}
              disabled={readOnly || noSection}
              title={`Tambah widget ${widget.label}`}
              onClick={() => store.getState().addWidget(widget)}
            >
              <span className={styles.tileIcon}>
                <WidgetIcon type={widget.type} />
              </span>
              <span className={styles.tileLabel}>{widget.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection id="left-media" title="Media" icon={<IconImages size={14} />}>
        <AssetLibrary
          pickLabel="Tambah ke artboard"
          onPick={(asset) => {
            if (!section || asset.width === null || asset.height === null) return;
            store.getState().addImage({
              assetId: asset.id,
              width: asset.width,
              height: asset.height,
              name: asset.filename,
            });
          }}
        />
      </PanelSection>

      <PanelSection
        id="left-base-bg"
        title="Latar Layar (Screen BG)"
        icon={<IconSparkle size={14} />}
        count={doc.design.background ? 1 : undefined}
      >
        <BaseBackgroundControl readOnly={readOnly} />
      </PanelSection>

      <PanelSection
        id="left-layers"
        title="Layer"
        icon={<IconLayers size={14} />}
        count={section ? layers.length : undefined}
      >
        {!section ? (
          <p className={styles.emptyHint}>Klik section di artboard untuk melihat layernya.</p>
        ) : layers.length === 0 ? (
          <p className={styles.emptyHint}>Section ini belum punya elemen.</p>
        ) : (
          <ul className={styles.layerList} data-testid="layer-list">
            {layers.map((element) => {
              const selected = selectedIds.includes(element.id);
              const isDragging = draggingId === element.id;
              const isDropTarget = dropTarget?.id === element.id;
              const dropPlacement = isDropTarget ? dropTarget.placement : undefined;

              return (
                <li
                  key={element.id}
                  className={styles.layerRow}
                  data-testid={`layer-${element.id}`}
                  data-selected={selected}
                  data-hidden={!element.visible}
                  data-locked={element.locked}
                  data-dragging={isDragging}
                  data-drop-target={dropPlacement}
                  draggable={!readOnly}
                  onDragStart={(event) => {
                    if (readOnly) return;
                    event.dataTransfer.setData("text/plain", element.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(element.id);
                  }}
                  onDragOver={(event) => {
                    if (readOnly || !draggingId || draggingId === element.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    const rect = event.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const placement = event.clientY < midY ? "above" : "below";
                    if (dropTarget?.id !== element.id || dropTarget?.placement !== placement) {
                      setDropTarget({ id: element.id, placement });
                    }
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    if (dropTarget?.id === element.id) {
                      setDropTarget(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
                    if (sourceId && dropTarget && section && sourceId !== dropTarget.id) {
                      store
                        .getState()
                        .moveElementLayer(section.id, sourceId, dropTarget.id, dropTarget.placement);
                    }
                    setDraggingId(null);
                    setDropTarget(null);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTarget(null);
                  }}
                >
                  <span
                    className={styles.layerGrip}
                    title="Tarik untuk memindahkan urutan layer"
                    aria-label="Tarik urutan layer"
                    data-testid={`layer-grip-${element.id}`}
                  >
                    <IconGripVertical size={13} />
                  </span>
                  <button
                    type="button"
                    className={styles.layerName}
                    aria-pressed={selected}
                    title={`${elementTypeLabel(element)}: ${elementLabel(element)}`}
                    onClick={(event) => {
                      if (event.shiftKey || event.ctrlKey || event.metaKey) {
                        store.getState().toggleElement(element.id);
                      } else {
                        store.getState().selectElements([element.id]);
                      }
                    }}
                  >
                    <span className={styles.layerIcon}>
                      <ElementIcon element={element} size={14} />
                    </span>
                    <span className={styles.layerText}>{elementLabel(element)}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.layerToggle}
                    aria-pressed={!element.visible}
                    aria-label={element.visible ? "Sembunyikan" : "Tampilkan"}
                    title={element.visible ? "Sembunyikan" : "Tampilkan"}
                    disabled={readOnly}
                    data-testid={`layer-visible-${element.id}`}
                    onClick={() => store.getState().setVisible([element.id], !element.visible)}
                  >
                    {element.visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    className={styles.layerToggle}
                    aria-pressed={element.locked}
                    aria-label={element.locked ? "Buka kunci" : "Kunci"}
                    title={element.locked ? "Buka kunci" : "Kunci"}
                    disabled={readOnly}
                    data-testid={`layer-lock-${element.id}`}
                    onClick={() => store.getState().setLocked([element.id], !element.locked)}
                  >
                    {element.locked ? <IconLock size={14} /> : <IconUnlock size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelSection>
    </aside>
  );
}

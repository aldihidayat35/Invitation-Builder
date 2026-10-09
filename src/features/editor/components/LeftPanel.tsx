"use client";

import { useState, type ReactNode } from "react";
import { defaultWidgetRegistry } from "@/features/widgets";
import { elementLabel, elementTypeLabel } from "../core/display";
import { findSection, type ElementKind } from "../core/ops";
import { assetUrl } from "@/features/assets/urls";
import { AssetLibrary } from "./AssetLibrary";
import { BaseBackgroundControl } from "./BaseBackgroundControl";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import {
  ElementIcon,
  IconCircle,
  IconEye,
  IconEyeOff,
  IconGif,
  IconGripVertical,
  IconGroup,
  IconImages,
  IconLayers,
  IconLine,
  IconLock,
  IconPlus,
  IconSection,
  IconSparkle,
  IconSquare,
  IconText,
  IconUngroup,
  IconUnlock,
  WidgetIcon,
} from "./icons";
import { GifLibrary } from "./gif/GifLibrary";
import { PanelSection } from "./PanelSection";
import { usePanelSectionOrder } from "./usePanelSectionOrder";
import styles from "./editor.module.css";

const PALETTE: ReadonlyArray<{ kind: ElementKind; label: string; icon: ReactNode }> = [
  { kind: "text", label: "Teks", icon: <IconText /> },
  { kind: "rectangle", label: "Persegi", icon: <IconSquare /> },
  { kind: "circle", label: "Lingkaran", icon: <IconCircle /> },
  { kind: "line", label: "Garis", icon: <IconLine /> },
  { kind: "decoration", label: "Dekorasi", icon: <IconSparkle /> },
];

export const DEFAULT_LEFT_PANEL_ORDER = [
  "left-elements",
  "left-widgets",
  "left-media",
  "left-gif",
  "left-base-bg",
  "left-layers",
] as const;

export type LeftPanelSectionId = (typeof DEFAULT_LEFT_PANEL_ORDER)[number];

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

  // Drag-and-drop state for layers inside the Layer section
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dropTargetLayer, setDropTargetLayer] = useState<{
    id: string;
    placement: "above" | "below";
  } | null>(null);

  // Reorderable sections hook (persisted to localStorage)
  const { order: sectionOrder, getDragProps } = usePanelSectionOrder(
    "dib:left-panel-section-order",
    DEFAULT_LEFT_PANEL_ORDER,
    readOnly,
  );

  const renderSection = (id: LeftPanelSectionId) => {
    switch (id) {
      case "left-elements":
        return (
          <PanelSection
            key="left-elements"
            id="left-elements"
            title="Tambah elemen"
            icon={<IconPlus size={14} />}
            defaultOpen={false}
            dragProps={getDragProps("left-elements")}
          >
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
        );

      case "left-widgets":
        return (
          <PanelSection
            key="left-widgets"
            id="left-widgets"
            title="Widget"
            icon={<IconSparkle size={14} />}
            defaultOpen={false}
            dragProps={getDragProps("left-widgets")}
          >
            <div className={styles.tileGrid}>
              {defaultWidgetRegistry.list().map((widget) => (
                <button
                  key={widget.type}
                  type="button"
                  className={styles.tile}
                  data-testid={`add-widget-${widget.type}`}
                  disabled={readOnly || noSection}
                  title={`Tambah widget ${widget.label}`}
                  onClick={() => {
                    if (widget.type === "rsvp") {
                      const doc = selectDoc(store.getState());
                      const hasRsvp = doc.sections.some((s) =>
                        s.elements.some((el) => el.type === "widget" && el.widgetType === "rsvp"),
                      );
                      if (hasRsvp) {
                        alert(
                          "Undangan ini sudah memiliki widget RSVP. Cukup gunakan 1 widget RSVP per undangan agar tamu tidak bingung.",
                        );
                        return;
                      }
                    }
                    store.getState().addWidget(widget);
                  }}
                >
                  <span className={styles.tileIcon}>
                    <WidgetIcon type={widget.type} />
                  </span>
                  <span className={styles.tileLabel}>{widget.label}</span>
                </button>
              ))}
            </div>
          </PanelSection>
        );

      case "left-media":
        return (
          <PanelSection
            key="left-media"
            id="left-media"
            title="Galeri Foto & Media"
            icon={<IconImages size={14} />}
            defaultOpen={false}
            dragProps={getDragProps("left-media")}
          >
            <AssetLibrary
              pickLabel="Tambah ke artboard"
              excludeGifs={false}
              onPick={(asset) => {
                if (!section) return;
                const isVideo = asset.mimeType.startsWith("video/");
                const isGif = asset.mimeType === "image/gif";

                if (isVideo) {
                  const videoDef = defaultWidgetRegistry.resolve("video");
                  if (videoDef.kind === "known") {
                    store.getState().addWidget(videoDef.definition, {
                      url: assetUrl(asset.id),
                      assetId: asset.id,
                      sourceType: "upload",
                      caption: asset.filename.replace(/\.[^/.]+$/, ""),
                    });
                  }
                  return;
                }

                if (isGif) {
                  const gifDef = defaultWidgetRegistry.resolve("gif");
                  if (gifDef.kind === "known") {
                    store.getState().addWidget(gifDef.definition, {
                      url: assetUrl(asset.id),
                      assetId: asset.id,
                      caption: asset.filename.replace(/\.[^/.]+$/, ""),
                    });
                  } else {
                    store.getState().addImage({
                      assetId: asset.id,
                      url: assetUrl(asset.id),
                      width: asset.width ?? 240,
                      height: asset.height ?? 240,
                      name: asset.filename,
                    });
                  }
                  return;
                }

                if (asset.width === null || asset.height === null) return;
                store.getState().addImage({
                  assetId: asset.id,
                  width: asset.width,
                  height: asset.height,
                  name: asset.filename,
                });
              }}
            />
          </PanelSection>
        );

      case "left-gif":
        return (
          <PanelSection
            key="left-gif"
            id="left-gif"
            title="GIF Animasi & Stiker"
            icon={<IconGif size={14} />}
            defaultOpen={false}
            dragProps={getDragProps("left-gif")}
          >
            <GifLibrary
              disabled={readOnly || noSection}
              onPick={(item) => {
                if (!section) return;
                const gifDef = defaultWidgetRegistry.resolve("gif");
                if (gifDef.kind === "known") {
                  store.getState().addWidget(gifDef.definition, {
                    url: item.url,
                    assetId: item.assetId,
                    caption: item.name ?? "",
                  });
                } else {
                  store.getState().addImage({
                    assetId: item.assetId,
                    url: item.url,
                    width: item.width ?? 240,
                    height: item.height ?? 240,
                    name: item.name ?? "Stiker Animasi",
                  });
                }
              }}
            />
          </PanelSection>
        );

      case "left-base-bg":
        return (
          <PanelSection
            key="left-base-bg"
            id="left-base-bg"
            title="Latar Layar (Screen BG)"
            icon={<IconSparkle size={14} />}
            count={doc.design.background ? 1 : undefined}
            defaultOpen={false}
            dragProps={getDragProps("left-base-bg")}
          >
            <BaseBackgroundControl readOnly={readOnly} />
          </PanelSection>
        );

      case "left-layers":
        return (
          <PanelSection
            key="left-layers"
            id="left-layers"
            title="Layer"
            icon={<IconLayers size={14} />}
            count={section ? layers.length : undefined}
            defaultOpen={false}
            dragProps={getDragProps("left-layers")}
          >
            {!section ? (
              <p className={styles.emptyHint}>Klik section di artboard untuk melihat layernya.</p>
            ) : layers.length === 0 ? (
              <p className={styles.emptyHint}>Section ini belum punya elemen.</p>
            ) : (
              <>
                {(selectedIds.length >= 2 ||
                  selectedIds.some((id) =>
                    section.elements.some((el) => el.id === id && Boolean(el.groupId)),
                  )) && (
                  <div className={styles.layerGroupActionBar}>
                    {selectedIds.length >= 2 && (
                      <button
                        type="button"
                        className={styles.layerGroupBtn}
                        disabled={readOnly}
                        onClick={() => store.getState().groupSelected()}
                        title="Grup elemen yang dipilih (Ctrl+G)"
                      >
                        <IconGroup size={13} />
                        <span>Grup ({selectedIds.length})</span>
                      </button>
                    )}
                    {selectedIds.some((id) =>
                      section.elements.some((el) => el.id === id && Boolean(el.groupId)),
                    ) && (
                      <button
                        type="button"
                        className={styles.layerGroupBtn}
                        disabled={readOnly}
                        onClick={() => store.getState().ungroupSelected()}
                        title="Pisahkan grup (Ctrl+Shift+G)"
                      >
                        <IconUngroup size={13} />
                        <span>Pisahkan Grup</span>
                      </button>
                    )}
                  </div>
                )}
                <ul className={styles.layerList} data-testid="layer-list">
                  {layers.map((element) => {
                    const selected = selectedIds.includes(element.id);
                    const isDragging = draggingLayerId === element.id;
                    const isDropTarget = dropTargetLayer?.id === element.id;
                    const dropPlacement = isDropTarget ? dropTargetLayer.placement : undefined;

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
                          setDraggingLayerId(element.id);
                        }}
                        onDragOver={(event) => {
                          if (readOnly || !draggingLayerId || draggingLayerId === element.id) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          const rect = event.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const placement = event.clientY < midY ? "above" : "below";
                          if (
                            dropTargetLayer?.id !== element.id ||
                            dropTargetLayer?.placement !== placement
                          ) {
                            setDropTargetLayer({ id: element.id, placement });
                          }
                        }}
                        onDragLeave={(event) => {
                          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                          if (dropTargetLayer?.id === element.id) {
                            setDropTargetLayer(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId =
                            event.dataTransfer.getData("text/plain") || draggingLayerId;
                          if (
                            sourceId &&
                            dropTargetLayer &&
                            section &&
                            sourceId !== dropTargetLayer.id
                          ) {
                            store
                              .getState()
                              .moveElementLayer(
                                section.id,
                                sourceId,
                                dropTargetLayer.id,
                                dropTargetLayer.placement,
                              );
                          }
                          setDraggingLayerId(null);
                          setDropTargetLayer(null);
                        }}
                        onDragEnd={() => {
                          setDraggingLayerId(null);
                          setDropTargetLayer(null);
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
                          title={`${elementTypeLabel(element)}: ${elementLabel(element)}${
                            element.groupId ? ` (${element.groupName || "Grup"})` : ""
                          }`}
                          onClick={(event) => {
                            if (event.shiftKey || event.ctrlKey || event.metaKey) {
                              store.getState().toggleElement(element.id);
                            } else if (event.altKey) {
                              store.getState().selectElements([element.id]);
                            } else if (element.groupId) {
                              const groupMemberIds = (section?.elements ?? [])
                                .filter((e) => e.groupId === element.groupId)
                                .map((e) => e.id);
                              store.getState().selectElements(groupMemberIds);
                            } else {
                              store.getState().selectElements([element.id]);
                            }
                          }}
                        >
                          <span className={styles.layerIcon}>
                            <ElementIcon element={element} size={14} />
                          </span>
                          <span className={styles.layerText}>{elementLabel(element)}</span>
                          {element.groupId && (
                            <span
                              className={styles.layerGroupBadge}
                              title={`Grup: ${element.groupName || "Grup"}`}
                            >
                              <IconGroup size={11} />
                            </span>
                          )}
                        </button>
                      <button
                        type="button"
                        className={styles.layerToggle}
                        aria-pressed={!element.visible}
                        aria-label={element.visible ? "Sembunyikan" : "Tampilkan"}
                        title={element.visible ? "Sembunyikan" : "Tampilkan"}
                        disabled={readOnly}
                        data-testid={`layer-visible-${element.id}`}
                        onClick={() =>
                          store.getState().setVisible([element.id], !element.visible)
                        }
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
                        onClick={() =>
                          store.getState().setLocked([element.id], !element.locked)
                        }
                      >
                        {element.locked ? <IconLock size={14} /> : <IconUnlock size={14} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </PanelSection>
        );
    }
  };

  return (
    <aside className={styles.side} aria-label="Panel kiri">
      <div className={styles.sideHeader}>
        <span className={styles.sideHeaderTitle}>Komponen</span>
        <span className={styles.sideHeaderHint}>
          {section ? `Ke: ${section.name || "Section aktif"}` : "Pilih section dulu"}
        </span>
      </div>

      {sectionOrder.map((id) => renderSection(id))}
    </aside>
  );
}

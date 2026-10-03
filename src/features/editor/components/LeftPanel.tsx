"use client";

import { defaultWidgetRegistry } from "@/features/widgets";
import { elementLabel } from "../core/display";
import { findSection, type ElementKind } from "../core/ops";
import { AssetLibrary } from "./AssetLibrary";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import styles from "./editor.module.css";

const PALETTE: ReadonlyArray<{ kind: ElementKind; label: string }> = [
  { kind: "text", label: "Teks" },
  { kind: "rectangle", label: "Persegi" },
  { kind: "circle", label: "Lingkaran" },
  { kind: "line", label: "Garis" },
  { kind: "decoration", label: "Dekorasi" },
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

  return (
    <aside className={styles.side} aria-label="Panel kiri">
      <div className={styles.panelStack}>
        <h2 className={styles.panelHeading}>Tambah elemen</h2>
        <div className={styles.palette}>
          {PALETTE.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              className={styles.paletteButton}
              data-testid={`add-${kind}`}
              disabled={readOnly || !section}
              onClick={() => store.getState().addElement(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.smallButton}
          data-testid="add-section"
          disabled={readOnly}
          onClick={() => store.getState().addSection()}
        >
          + Section baru
        </button>
      </div>

      <div className={styles.panelStack}>
        <h2 className={styles.panelHeading}>Widget</h2>
        <div className={styles.palette}>
          {defaultWidgetRegistry.list().map((widget) => (
            <button
              key={widget.type}
              type="button"
              className={styles.paletteButton}
              data-testid={`add-widget-${widget.type}`}
              disabled={readOnly || !section}
              onClick={() => store.getState().addWidget(widget)}
            >
              {widget.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panelStack}>
        <h2 className={styles.panelHeading}>Gambar</h2>
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
      </div>
      <div className={styles.panelStack}>
        <h2 className={styles.panelHeading}>Layer</h2>
        {!section ? (
          <p className={styles.muted}>Pilih section.</p>
        ) : layers.length === 0 ? (
          <p className={styles.muted}>Section ini belum punya elemen.</p>
        ) : (
          <ul className={styles.layerList} data-testid="layer-list">
            {layers.map((element) => {
              const selected = selectedIds.includes(element.id);
              return (
                <li
                  key={element.id}
                  className={styles.layerRow}
                  data-testid={`layer-${element.id}`}
                  data-selected={selected}
                  data-hidden={!element.visible}
                >
                  <button
                    type="button"
                    className={styles.layerName}
                    aria-pressed={selected}
                    onClick={(event) => {
                      if (event.shiftKey || event.ctrlKey || event.metaKey) {
                        store.getState().toggleElement(element.id);
                      } else {
                        store.getState().selectElements([element.id]);
                      }
                    }}
                  >
                    {elementLabel(element)}
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
                    {element.visible ? "👁" : "⊘"}
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
                    {element.locked ? "🔒" : "🔓"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

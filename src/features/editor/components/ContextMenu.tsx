"use client";

import { useEffect, useRef } from "react";
import { useEditor, useEditorStore } from "./EditorProvider";
import {
  IconBackward,
  IconBringFront,
  IconClipboardCopy,
  IconClipboardPaste,
  IconDuplicate,
  IconEyeOff,
  IconForward,
  IconGroup,
  IconLock,
  IconPlus,
  IconSection,
  IconSendBack,
  IconTrash,
  IconUngroup,
  IconUnlock,
} from "./icons";
import { findElement, type ReorderMode } from "../core/ops";
import styles from "./editor.module.css";

export interface ContextMenuProps {
  readonly isOpen: boolean;
  readonly x: number;
  readonly y: number;
  readonly canvasX: number;
  readonly canvasY: number;
  readonly sectionId: string;
  readonly elementId?: string;
  readonly onClose: () => void;
}

export function ContextMenu({
  isOpen,
  x,
  y,
  canvasX,
  canvasY,
  sectionId,
  elementId,
  onClose,
}: ContextMenuProps) {
  const store = useEditorStore();
  const doc = useEditor((s) => s.history.present);
  const clipboard = useEditor((s) => s.clipboard);
  const readOnly = useEditor((s) => s.readOnly);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click, window blur, or Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => {
      onClose();
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loc = elementId ? findElement(doc, elementId) : undefined;
  const element = loc?.element;
  const isLocked = Boolean(element?.locked);
  const hasClipboard = clipboard.length > 0;
  const selectedIds = store.getState().selectedIds;
  const canGroup = selectedIds.length >= 2;
  const hasGroup = Boolean(
    element?.groupId ||
    selectedIds.some((id) => findElement(doc, id)?.element.groupId),
  );

  // Viewport bounds clamping
  const menuWidth = 210;
  const menuHeight = element ? 330 : 160;
  const left = typeof window !== "undefined" ? Math.min(x, window.innerWidth - menuWidth - 8) : x;
  const top = typeof window !== "undefined" ? Math.min(y, window.innerHeight - menuHeight - 8) : y;

  const handleAction = (fn: () => void) => {
    fn();
    onClose();
  };

  const reorder = (mode: ReorderMode) => {
    if (!elementId) return;
    handleAction(() => store.getState().reorder(mode, [elementId]));
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      data-testid="editor-context-menu"
      role="menu"
    >
      {element ? (
        <>
          {/* Element Context Actions */}
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-duplicate"
            onClick={() => handleAction(() => store.getState().duplicateSelected())}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconDuplicate size={15} />
              <span>Duplikat</span>
            </div>
            <span className={styles.contextMenuItemShortcut}>Ctrl+D</span>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-copy"
            onClick={() => handleAction(() => store.getState().copySelected())}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconClipboardCopy size={15} />
              <span>Salin</span>
            </div>
            <span className={styles.contextMenuItemShortcut}>Ctrl+C</span>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || !hasClipboard}
            data-testid="ctx-paste"
            onClick={() =>
              handleAction(() =>
                store.getState().paste({
                  position: { x: canvasX, y: canvasY },
                  sectionId,
                }),
              )
            }
          >
            <div className={styles.contextMenuItemLeft}>
              <IconClipboardPaste size={15} />
              <span>Tempel di Sini</span>
            </div>
            <span className={styles.contextMenuItemShortcut}>Ctrl+V</span>
          </button>

          {(canGroup || hasGroup) && <div className={styles.contextMenuDivider} />}

          {canGroup && (
            <button
              type="button"
              className={styles.contextMenuItem}
              disabled={readOnly}
              data-testid="ctx-group"
              onClick={() => handleAction(() => store.getState().groupSelected())}
            >
              <div className={styles.contextMenuItemLeft}>
                <IconGroup size={15} />
                <span>Grup Elemen</span>
              </div>
              <span className={styles.contextMenuItemShortcut}>Ctrl+G</span>
            </button>
          )}

          {hasGroup && (
            <button
              type="button"
              className={styles.contextMenuItem}
              disabled={readOnly}
              data-testid="ctx-ungroup"
              onClick={() => handleAction(() => store.getState().ungroupSelected())}
            >
              <div className={styles.contextMenuItemLeft}>
                <IconUngroup size={15} />
                <span>Pisahkan Grup</span>
              </div>
              <span className={styles.contextMenuItemShortcut}>Ctrl+Shift+G</span>
            </button>
          )}

          <div className={styles.contextMenuDivider} />

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || isLocked}
            data-testid="ctx-front"
            onClick={() => reorder("front")}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconBringFront size={15} />
              <span>Paling Depan</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || isLocked}
            data-testid="ctx-forward"
            onClick={() => reorder("forward")}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconForward size={15} />
              <span>Maju Satu Layer</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || isLocked}
            data-testid="ctx-backward"
            onClick={() => reorder("backward")}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconBackward size={15} />
              <span>Mundur Satu Layer</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || isLocked}
            data-testid="ctx-back"
            onClick={() => reorder("back")}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconSendBack size={15} />
              <span>Paling Belakang</span>
            </div>
          </button>

          <div className={styles.contextMenuDivider} />

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-lock"
            onClick={() =>
              handleAction(() => store.getState().setLocked([element.id], !isLocked))
            }
          >
            <div className={styles.contextMenuItemLeft}>
              {isLocked ? <IconUnlock size={15} /> : <IconLock size={15} />}
              <span>{isLocked ? "Buka Kunci" : "Kunci"}</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-hide"
            onClick={() =>
              handleAction(() => store.getState().setVisible([element.id], false))
            }
          >
            <div className={styles.contextMenuItemLeft}>
              <IconEyeOff size={15} />
              <span>Sembunyikan</span>
            </div>
          </button>

          <div className={styles.contextMenuDivider} />

          <button
            type="button"
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            disabled={readOnly || isLocked}
            data-testid="ctx-delete"
            onClick={() => handleAction(() => store.getState().deleteSelected())}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconTrash size={15} />
              <span>Hapus</span>
            </div>
            <span className={styles.contextMenuItemShortcut}>Del</span>
          </button>
        </>
      ) : (
        <>
          {/* Empty Section Canvas Context Actions */}
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly || !hasClipboard}
            data-testid="ctx-paste-section"
            onClick={() =>
              handleAction(() =>
                store.getState().paste({
                  position: { x: canvasX, y: canvasY },
                  sectionId,
                }),
              )
            }
          >
            <div className={styles.contextMenuItemLeft}>
              <IconClipboardPaste size={15} />
              <span>Tempel di Sini</span>
            </div>
            <span className={styles.contextMenuItemShortcut}>Ctrl+V</span>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-duplicate-section"
            onClick={() => handleAction(() => store.getState().duplicateSection(sectionId))}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconSection size={15} />
              <span>Duplikat Section</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={readOnly}
            data-testid="ctx-add-section"
            onClick={() => handleAction(() => store.getState().addSection(sectionId))}
          >
            <div className={styles.contextMenuItemLeft}>
              <IconPlus size={15} />
              <span>Tambah Section Baru</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { useId, useState, type ReactNode } from "react";
import {
  IconChevron,
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
} from "./icons";
import type { ReorderDragProps } from "./usePanelSectionOrder";
import styles from "./editor.module.css";

/** Session memory for sections that explicitly opt into persistent memory across unmounts. */
const openMemory = new Map<string, boolean>();

export interface PanelSectionProps {
  /** Stable key used to identify the section. */
  readonly id: string;
  readonly title: string;
  readonly icon?: ReactNode;
  /** Small counter badge next to the title (e.g. number of layers). */
  readonly count?: number;
  /** Extra controls rendered at the right of the header (outside the toggle button). */
  readonly actions?: ReactNode;
  /** Initial open state. Defaults to false (all groups start collapsed). */
  readonly defaultOpen?: boolean;
  /** Opt-in flag to remember open state in memory across unmounts. Defaults to false. */
  readonly rememberOpen?: boolean;
  /** Dynamic scope key (e.g. element.id). When changed, the open state resets to defaultOpen. */
  readonly scopeKey?: string;
  /** Drag-and-drop / reordering props from usePanelSectionOrder. */
  readonly dragProps?: ReorderDragProps;
  readonly children: ReactNode;
}

/** Collapsible panel group (accessible disclosure: heading > button[aria-expanded]). */
export function PanelSection({
  id,
  title,
  icon,
  count,
  actions,
  defaultOpen = false,
  rememberOpen = false,
  scopeKey,
  dragProps,
  children,
}: PanelSectionProps) {
  const bodyId = useId();

  const [open, setOpen] = useState(() => {
    if (rememberOpen) {
      return openMemory.get(id) ?? defaultOpen;
    }
    return defaultOpen;
  });

  // Reset open state when the scopeKey (e.g. selected element ID) changes.
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey);
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey);
    setOpen(defaultOpen);
  }

  const toggle = () => {
    const next = !open;
    if (rememberOpen) {
      openMemory.set(id, next);
    }
    setOpen(next);
  };

  return (
    <section
      className={styles.pSection}
      data-open={open}
      data-section-key={id}
      data-dragging={dragProps?.isDragging ? "true" : undefined}
      data-drop-target={dragProps?.dropPlacement}
      onDragOver={dragProps?.onDragOver}
      onDragLeave={dragProps?.onDragLeave}
      onDrop={dragProps?.onDrop}
      onDragEnd={dragProps?.onDragEnd}
    >
      <div className={styles.pSectionHeader}>
        {dragProps ? (
          <span
            className={styles.pSectionGrip}
            draggable={dragProps.draggable}
            onDragStart={dragProps.onDragStart}
            title="Tarik untuk memindahkan urutan kelompok"
            aria-label="Tarik urutan kelompok"
            data-testid={`section-grip-${id}`}
          >
            <IconGripVertical size={13} />
          </span>
        ) : null}

        <h2 className={styles.pSectionHeading}>
          <button
            type="button"
            className={styles.pSectionToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={toggle}
          >
            <IconChevron size={14} className={styles.pSectionChevron} />
            {icon ? <span className={styles.pSectionIcon}>{icon}</span> : null}
            <span className={styles.pSectionTitle}>{title}</span>
            {count !== undefined ? <span className={styles.countBadge}>{count}</span> : null}
          </button>
        </h2>

        {dragProps && (dragProps.canMoveUp || dragProps.canMoveDown) ? (
          <div className={styles.pSectionOrderBtns} role="group" aria-label="Pindah urutan">
            <button
              type="button"
              className={styles.pSectionOrderBtn}
              disabled={!dragProps.canMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                dragProps.onMoveUp();
              }}
              title="Pindah ke atas"
              aria-label={`Pindah kelompok ${title} ke atas`}
              data-testid={`section-move-up-${id}`}
            >
              <IconChevronUp size={11} />
            </button>
            <button
              type="button"
              className={styles.pSectionOrderBtn}
              disabled={!dragProps.canMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                dragProps.onMoveDown();
              }}
              title="Pindah ke bawah"
              aria-label={`Pindah kelompok ${title} ke bawah`}
              data-testid={`section-move-down-${id}`}
            >
              <IconChevronDown size={11} />
            </button>
          </div>
        ) : null}

        {actions ? <div className={styles.pSectionActions}>{actions}</div> : null}
      </div>

      {open ? (
        <div id={bodyId} className={styles.pSectionBody}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

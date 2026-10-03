"use client";

import { useId, useState, type ReactNode } from "react";
import { IconChevron } from "./icons";
import styles from "./editor.module.css";

/** Open/closed state survives re-mounts (e.g. switching selection) for the browser session. */
const openMemory = new Map<string, boolean>();

export interface PanelSectionProps {
  /** Stable key used to remember the open state. */
  readonly id: string;
  readonly title: string;
  readonly icon?: ReactNode;
  /** Small counter badge next to the title (e.g. number of layers). */
  readonly count?: number;
  /** Extra controls rendered at the right of the header (outside the toggle button). */
  readonly actions?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

/** Collapsible panel group (accessible disclosure: heading > button[aria-expanded]). */
export function PanelSection({
  id,
  title,
  icon,
  count,
  actions,
  defaultOpen = true,
  children,
}: PanelSectionProps) {
  const bodyId = useId();
  const [open, setOpen] = useState(() => openMemory.get(id) ?? defaultOpen);
  const toggle = () => {
    const next = !open;
    openMemory.set(id, next);
    setOpen(next);
  };

  return (
    <section className={styles.pSection} data-open={open} data-section-key={id}>
      <div className={styles.pSectionHeader}>
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

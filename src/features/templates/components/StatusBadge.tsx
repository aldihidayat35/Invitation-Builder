import type { TemplateLifecycle } from "../types";
import styles from "./templates.module.css";

const LABELS: Record<TemplateLifecycle, string> = {
  draft: "Draft",
  published: "Published",
  "published-with-changes": "Published · ada perubahan",
  archived: "Diarsipkan",
};

/** Draft / Published indicator (UI minimum). Also exposes the state as data for tests. */
export function StatusBadge({
  lifecycle,
  versionNo,
}: {
  lifecycle: TemplateLifecycle;
  versionNo?: number | null;
}) {
  return (
    <span className={styles.badge} data-lifecycle={lifecycle} data-testid="status-badge">
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[lifecycle]}
      {versionNo && lifecycle !== "archived" && lifecycle !== "draft" ? ` · v${versionNo}` : ""}
    </span>
  );
}

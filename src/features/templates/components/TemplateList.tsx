import Link from "next/link";
import type { TemplateLifecycle, TemplateSummary } from "../types";
import type { TemplateAction } from "./action-state";
import { StatusBadge } from "./StatusBadge";
import { TemplateActions } from "./TemplateActions";
import styles from "./templates.module.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const LIFECYCLE_HINT: Record<TemplateLifecycle, string> = {
  draft: "Masih draft — publish agar bisa dipakai untuk membuat undangan.",
  published: "Siap dipakai untuk membuat undangan.",
  "published-with-changes": "Ada perubahan desain yang belum dipublish.",
  archived: "Diarsipkan — hanya bisa dilihat.",
};

export function TemplateList({
  templates,
  canWrite,
  canArchive,
  actions,
  emptyMessage,
}: {
  templates: TemplateSummary[];
  canWrite: boolean;
  canArchive: boolean;
  actions: { rename: TemplateAction; duplicate: TemplateAction; archive: TemplateAction };
  emptyMessage: string;
}) {
  if (templates.length === 0) {
    return (
      <div className={styles.empty} data-testid="empty-state">
        <span className={styles.emptyMark} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="4" y="3" width="16" height="18" rx="2" strokeWidth="1.7" />
            <path d="M8 8h8M8 12h8M8 16h5" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} aria-label="Daftar template">
      {templates.map((template) => (
        <li key={template.id} className={styles.card} data-testid="template-card">
          <div className={styles.cardTop}>
            <StatusBadge lifecycle={template.lifecycle} versionNo={template.publishedVersionNo} />
          </div>
          <h3 className={styles.cardName}>
            {template.status === "archived" ? (
              <span>{template.name}</span>
            ) : (
              <Link href={`/dashboard/templates/${template.id}`} data-testid="open-template">
                {template.name}
              </Link>
            )}
          </h3>
          <p className={styles.cardHint}>{LIFECYCLE_HINT[template.lifecycle]}</p>
          <span className={styles.meta}>
            Diubah {dateFormat.format(template.updatedAt)} · revisi {template.revision}
          </span>
          {template.status !== "archived" ? (
            <TemplateActions
              templateId={template.id}
              templateName={template.name}
              canWrite={canWrite}
              canArchive={canArchive}
              rename={actions.rename}
              duplicate={actions.duplicate}
              archive={actions.archive}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

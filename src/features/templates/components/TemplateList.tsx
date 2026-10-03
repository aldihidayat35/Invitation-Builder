import Link from "next/link";
import type { TemplateSummary } from "../types";
import type { TemplateAction } from "./action-state";
import { StatusBadge } from "./StatusBadge";
import { TemplateActions } from "./TemplateActions";
import styles from "./templates.module.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

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
        <span className={styles.emptyMark} aria-hidden="true" />
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
            <span className={styles.meta}>
              Diubah {dateFormat.format(template.updatedAt)} · rev {template.revision}
            </span>
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

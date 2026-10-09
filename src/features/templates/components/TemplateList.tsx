import Link from "next/link";
import type { TemplateLifecycle, TemplateSummary } from "../types";
import type { TemplateAction } from "./action-state";
import { StatusBadge } from "./StatusBadge";
import { TemplateActions } from "./TemplateActions";
import { IconEditorStudio, IconPreviewEye } from "./template-icons";
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
  canDelete = canArchive,
  actions,
  categoryNames = {},
  emptyMessage,
}: {
  templates: TemplateSummary[];
  canWrite: boolean;
  canArchive: boolean;
  canDelete?: boolean;
  actions: {
    rename: TemplateAction;
    duplicate: TemplateAction;
    archive: TemplateAction;
    delete?: TemplateAction;
  };
  categoryNames?: Record<string, string>;
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
        <li key={template.id} className={styles.catalogCard} data-testid="template-card">
          {/* Card Media Header */}
          <div className={styles.catalogCardMedia}>
            {template.thumbnailUrl ? (
              <>
                {/* User-managed URLs are served by the authenticated asset endpoint. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.thumbnailUrl}
                  alt={`Thumbnail ${template.name}`}
                  className={styles.catalogCardImg}
                  loading="lazy"
                />
              </>
            ) : (
              <div className={styles.catalogCardFallback}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#B8A392" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <span className={styles.catalogCardFallbackTitle}>{template.name}</span>
              </div>
            )}
            <div className={styles.catalogCardBadgeBar}>
              <StatusBadge lifecycle={template.lifecycle} versionNo={template.publishedVersionNo} />
              {template.category ? (
                <span className={styles.catalogCategoryChip}>
                  {categoryNames[template.category] || template.category}
                </span>
              ) : null}
            </div>
          </div>

          {/* Card Body */}
          <div className={styles.catalogCardBody}>
            <h3 className={styles.catalogCardName}>
              {template.status === "archived" ? (
                <span>{template.name}</span>
              ) : (
                <Link href={`/dashboard/templates/${template.id}`} data-testid="open-template">
                  {template.name}
                </Link>
              )}
            </h3>
            {template.description ? (
              <p className={styles.catalogCardDesc}>{template.description}</p>
            ) : (
              <p className={styles.cardHint}>{LIFECYCLE_HINT[template.lifecycle]}</p>
            )}
            <div className={styles.catalogCardMeta}>
              <span>Diubah {dateFormat.format(template.updatedAt)}</span>
              <span>Revisi #{template.revision}</span>
            </div>
          </div>

          {/* Card Actions Footer */}
          {template.status !== "archived" ? (
            <div className={styles.catalogCardActions}>
              <div className={styles.catalogBtnRowPrimary}>
                <Link
                  href={`/editor/${template.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.livePreviewBtn}
                  title="Buka pratinjau langsung di tab baru"
                >
                  <IconPreviewEye size={15} />
                  <span>Live Preview</span>
                </Link>
                {canWrite ? (
                  <Link
                    href={`/editor/${template.id}`}
                    className={styles.editorLaunchBtn}
                    title="Buka Studio Editor Desain"
                  >
                    <IconEditorStudio size={15} />
                    <span>Buka Studio</span>
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/templates/${template.id}`}
                    className={styles.editorLaunchBtn}
                    title="Lihat Detail Template"
                  >
                    <span>Detail</span>
                  </Link>
                )}
              </div>

              <TemplateActions
                templateId={template.id}
                templateName={template.name}
                canWrite={canWrite}
                canArchive={canArchive}
                canDelete={canDelete}
                rename={actions.rename}
                duplicate={actions.duplicate}
                archive={actions.archive}
                delete={actions.delete}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

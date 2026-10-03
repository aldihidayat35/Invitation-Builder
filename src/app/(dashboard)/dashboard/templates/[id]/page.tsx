import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateNotFoundError, openTemplate, permissionsFor } from "@/features/templates/api";
import {
  PublishPanel,
  StatusBadge,
  TemplateActions,
  ValidationPanel,
} from "@/features/templates/components";
import styles from "@/features/templates/components/templates.module.css";
import {
  archiveTemplateAction,
  duplicateTemplateAction,
  publishTemplateAction,
  renameTemplateAction,
} from "../actions";

export const metadata: Metadata = { title: "Detail template" };

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function TemplateDetailPage({
  params,
}: PageProps<"/dashboard/templates/[id]">) {
  const { id } = await params;

  let template;
  try {
    template = await openTemplate(id);
  } catch (error) {
    // Cross-workspace and missing ids are indistinguishable by design.
    if (error instanceof TemplateNotFoundError) notFound();
    throw error;
  }
  const permissions = await permissionsFor(template.workspaceId);
  const archived = template.lifecycle === "archived";

  return (
    <main className={styles.page}>
      <Link href="/dashboard/templates" className={styles.breadcrumb}>
        ← Template Library
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <StatusBadge lifecycle={template.lifecycle} versionNo={template.publishedVersionNo} />
          </p>
          <h1 className={styles.title} data-testid="template-title">
            {template.name}
          </h1>
        </div>
        {!archived ? (
          <TemplateActions
            templateId={template.id}
            templateName={template.name}
            canWrite={permissions.write}
            canArchive={permissions.archive}
            rename={renameTemplateAction}
            duplicate={duplicateTemplateAction}
            archive={archiveTemplateAction}
          />
        ) : null}
      </header>

      <section className={styles.panel} aria-labelledby="draft-heading">
        <h2 id="draft-heading" className={styles.panelTitle}>
          Draft
        </h2>
        <div className={styles.facts}>
          <span className={styles.fact}>
            Revisi <strong>{template.revision}</strong>
          </span>
          <span className={styles.fact}>
            Section <strong>{template.document.sections.length}</strong>
          </span>
          <span className={styles.fact}>
            Variable <strong>{template.document.variables.length}</strong>
          </span>
          <span className={styles.fact}>
            Schema <code>v{template.document.schemaVersion}</code>
          </span>
          <span className={styles.fact}>
            Diubah <strong>{dateFormat.format(template.updatedAt)}</strong>
          </span>
        </div>
        <p className={styles.muted}>
          Draft disimpan sebagai JSON tervalidasi.{" "}
          <Link href={`/editor/${template.id}`} id="open-editor" data-testid="open-editor">
            {archived ? "Lihat di editor (read-only)" : "Buka editor"}
          </Link>
        </p>
      </section>

      {archived ? (
        <p className={styles.muted} data-testid="archived-note">
          Template ini diarsipkan dan bersifat read-only.
        </p>
      ) : (
        <>
          <ValidationPanel templateId={template.id} />
          <PublishPanel
            templateId={template.id}
            revision={template.revision}
            canPublish={permissions.publish}
            unpublishedChanges={template.hasUnpublishedChanges}
            neverPublished={template.publishedVersionNo === null}
            action={publishTemplateAction}
          />
        </>
      )}

      <section className={styles.panel} aria-labelledby="versions-heading">
        <h2 id="versions-heading" className={styles.panelTitle}>
          Riwayat versi
        </h2>
        {template.versions.length === 0 ? (
          <p className={styles.muted}>Belum ada versi yang dipublish.</p>
        ) : (
          <ul className={styles.versions} data-testid="version-list">
            {template.versions.map((version) => (
              <li key={version.id} className={styles.version}>
                <span>
                  <strong>v{version.versionNo}</strong>
                  {version.note ? ` · ${version.note}` : ""}
                </span>
                <span className={styles.meta}>
                  {dateFormat.format(version.createdAt)} · immutable
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

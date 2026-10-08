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
import {
  IconArrowLeft,
  IconEditorStudio,
  IconHistory,
  IconInfoCircle,
  IconLayers,
  IconPreviewEye,
  IconSmartphone,
  IconSparkles,
  IconVariableChip,
} from "@/features/templates/components/template-icons";
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

  const totalElements = template.document.sections.reduce(
    (acc, sec) => acc + sec.elements.length,
    0,
  );

  return (
    <main className={styles.pageDetail}>
      <Link href="/dashboard/templates" className={styles.detailBreadcrumb}>
        <IconArrowLeft size={14} />
        <span>Kembali ke Koleksi Template</span>
      </Link>

      <header className={styles.headerDetail}>
        <div className={styles.headerTitleWrapper}>
          <div className={styles.headerBadgeRow}>
            <span className={styles.templateTypeTag}>Template Undangan</span>
            <StatusBadge lifecycle={template.lifecycle} versionNo={template.publishedVersionNo} />
          </div>
          <h1 className={styles.titleDetail} data-testid="template-title">
            {template.name}
          </h1>
          <p className={styles.titleDescription}>
            Kelola desain visual, periksa integritas format, dan terbitkan versi siap pakai untuk undangan pernikahan Anda.
          </p>
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

      {/* Hero Studio Editor Launchpad Card */}
      <section className={styles.heroLaunchpad} aria-labelledby="editor-launchpad-heading">
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>
            <IconSparkles size={14} />
            <span>Studio Desain Visual Interaktif</span>
          </div>
          <h2 id="editor-launchpad-heading" className={styles.heroTitle}>
            Studio Editor Undangan
          </h2>
          <p className={styles.heroDesc}>
            Buka studio editor visual untuk menyusun tata letak undangan secara langsung (WYSIWYG). Anda dapat mengubah teks biasa menjadi variabel dinamis, mengatur foto & video, menambahkan animasi, serta menyesuaikan seluruh elemen undangan.
          </p>

          <div className={styles.heroActionGroup}>
            <Link
              href={`/editor/${template.id}`}
              id="open-editor"
              data-testid="open-editor"
              className={styles.heroEditorBtn}
            >
              <span className={styles.heroEditorBtnIcon}>
                <IconEditorStudio size={20} />
              </span>
              <span className={styles.heroEditorBtnContent}>
                <span className={styles.heroEditorBtnLabel}>
                  {archived ? "Lihat di Studio Editor" : "Buka Studio Editor"}
                </span>
                <span className={styles.heroEditorBtnSub}>
                  {archived ? "Mode Pratinjau Read-Only" : "Mulai Desain & Kustomisasi Kanvas →"}
                </span>
              </span>
            </Link>

            <Link
              href={`/editor/${template.id}/preview`}
              target="_blank"
              rel="noreferrer"
              className={styles.heroPreviewBtn}
              title="Buka pratinjau penuh di tab baru"
            >
              <IconPreviewEye size={18} />
              <span>Pratinjau Layar Penuh</span>
            </Link>
          </div>

          <div className={styles.heroTipRow}>
            <IconInfoCircle size={15} />
            <span>
              Setiap perubahan pada Studio Editor otomatis disimpan sebagai draft secara realtime.
            </span>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.heroArtboardPeek}>
            <div className={styles.artboardPeekHeader}>
              <span className={styles.artboardPeekTitle}>
                <IconSmartphone size={16} /> Artboard Kanvas (390px)
              </span>
              <span className={styles.fact}>
                Revisi <strong>#{template.revision}</strong>
              </span>
            </div>

            <div className={styles.artboardMockFrame}>
              <div className={styles.artboardMockNotch} />
              {template.document.sections.slice(0, 3).map((sec, idx) => (
                <div key={sec.id} className={styles.artboardMockSection}>
                  <span>
                    {idx + 1}. {sec.name}
                  </span>
                  {sec.isOpening ? (
                    <span className={styles.sectionOpeningChip}>Opening</span>
                  ) : (
                    <span className={styles.sectionElementsMeta}>{sec.elements.length} elemen</span>
                  )}
                </div>
              ))}
              {template.document.sections.length > 3 ? (
                <div
                  className={styles.artboardMockSection}
                  style={{ justifyContent: "center", color: "var(--dash-muted)" }}
                >
                  +{template.document.sections.length - 3} bagian lainnya
                </div>
              ) : null}
            </div>

            <div className={styles.artboardStatsGrid}>
              <div className={styles.artboardStatCard}>
                <span className={styles.artboardStatLabel}>Total Bagian</span>
                <span className={styles.artboardStatValue}>
                  {template.document.sections.length} Section
                </span>
              </div>
              <div className={styles.artboardStatCard}>
                <span className={styles.artboardStatLabel}>Total Objek</span>
                <span className={styles.artboardStatValue}>{totalElements} Elemen</span>
              </div>
              <div className={styles.artboardStatCard}>
                <span className={styles.artboardStatLabel}>Variabel Dinamis</span>
                <span className={styles.artboardStatValue}>
                  {template.document.variables.length} Variabel
                </span>
              </div>
              <div className={styles.artboardStatCard}>
                <span className={styles.artboardStatLabel}>Pembaruan Terakhir</span>
                <span className={styles.artboardStatValue} style={{ fontSize: "0.78rem" }}>
                  {dateFormat.format(template.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Interactive Workflow Strip */}
      <div className={styles.workflowStrip} role="region" aria-label="Alur Pengelolaan Template">
        <div className={styles.workflowStep}>
          <div className={styles.workflowStepNumber}>1</div>
          <div className={styles.workflowStepInfo}>
            <span className={styles.workflowStepTitle}>Rancang di Studio Editor</span>
            <span className={styles.workflowStepDesc}>
              Kustomisasi tata letak, teks dinamis tamu, media foto/video, dan animasi transisi.
            </span>
          </div>
        </div>
        <div className={styles.workflowStep}>
          <div className={styles.workflowStepNumber}>2</div>
          <div className={styles.workflowStepInfo}>
            <span className={styles.workflowStepTitle}>Validasi Kualitas Draft</span>
            <span className={styles.workflowStepDesc}>
              Periksa struktur skema dan variabel pengikatan agar tidak ada format yang rusak.
            </span>
          </div>
        </div>
        <div className={styles.workflowStep}>
          <div className={styles.workflowStepNumber}>3</div>
          <div className={styles.workflowStepInfo}>
            <span className={styles.workflowStepTitle}>Publikasikan Versi Resmi</span>
            <span className={styles.workflowStepDesc}>
              Terbitkan versi immutable resmi yang siap digunakan untuk pesanan undangan tamu.
            </span>
          </div>
        </div>
      </div>

      {archived ? (
        <div className={styles.panel} data-testid="archived-note">
          <p className={styles.muted}>
            Template ini diarsipkan dan bersifat read-only.
          </p>
        </div>
      ) : null}

      {/* Interactive 2-Column Grid */}
      <div className={styles.cardGrid}>
        {/* Column 1: Draft Structure & Components */}
        <section className={styles.interactiveCard} aria-labelledby="draft-heading">
          <div className={styles.cardHeaderBlock}>
            <div className={styles.cardHeaderInfo}>
              <div className={styles.cardIconBox}>
                <IconLayers size={20} />
              </div>
              <div>
                <h2 id="draft-heading" className={styles.cardTitleText}>
                  Struktur Bagian & Konten Draft
                </h2>
                <p className={styles.cardSubtitleText}>
                  Ringkasan bagian undangan dan variabel dinamis yang terpasang di template ini.
                </p>
              </div>
            </div>
          </div>

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

          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 650, margin: "0 0 8px" }}>
              Daftar Bagian Undangan (Sections):
            </h3>
            <div className={styles.sectionCardsList}>
              {template.document.sections.map((section, idx) => (
                <div key={section.id} className={styles.sectionItemRow}>
                  <div className={styles.sectionItemLeft}>
                    <span className={styles.sectionIndexBadge}>{idx + 1}</span>
                    <strong style={{ color: "var(--dash-text)" }}>{section.name}</strong>
                    {section.isOpening ? (
                      <span className={styles.sectionOpeningChip}>Opening Screen</span>
                    ) : null}
                  </div>
                  <span className={styles.sectionElementsMeta}>
                    {section.elements.length} elemen · {section.baseHeight}px
                  </span>
                </div>
              ))}
            </div>
          </div>

          {template.document.variables.length > 0 ? (
            <div>
              <h3
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 650,
                  margin: "0 0 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <IconVariableChip size={15} /> Variabel Dinamis Terdaftar:
              </h3>
              <div className={styles.variableChipsRow}>
                {template.document.variables.map((v) => (
                  <div key={v.key} className={styles.variableTagChip}>
                    <code className={styles.variableKey}>{v.key}</code>
                    <span style={{ fontSize: "0.72rem", color: "var(--dash-muted)" }}>
                      ({v.label})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <p className={styles.muted} style={{ fontSize: "0.8rem", borderTop: "1px dashed var(--dash-border)", paddingTop: "12px", margin: 0 }}>
            Draft disimpan sebagai JSON tervalidasi. Seluruh konfigurasi dapat diubah secara visual di Studio Editor.
          </p>
        </section>

        {/* Column 2: Validation & Quality */}
        {!archived ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <ValidationPanel templateId={template.id} />

            <PublishPanel
              templateId={template.id}
              revision={template.revision}
              canPublish={permissions.publish}
              unpublishedChanges={template.hasUnpublishedChanges}
              neverPublished={template.publishedVersionNo === null}
              action={publishTemplateAction}
            />
          </div>
        ) : null}
      </div>

      {/* Version History Card */}
      <section className={styles.interactiveCard} aria-labelledby="versions-heading">
        <div className={styles.cardHeaderBlock}>
          <div className={styles.cardHeaderInfo}>
            <div className={styles.cardIconBox}>
              <IconHistory size={20} />
            </div>
            <div>
              <h2 id="versions-heading" className={styles.cardTitleText}>
                Riwayat Versi Terpublikasi
              </h2>
              <p className={styles.cardSubtitleText}>
                Daftar rilis versi snapshot yang siap dan aman digunakan untuk pesanan undangan.
              </p>
            </div>
          </div>
        </div>

        {template.versions.length === 0 ? (
          <div className={styles.emptyVersionBox}>
            <p className={styles.muted} style={{ margin: 0 }}>
              Belum ada versi yang dipublish. Setelah selesai mendesain di Studio Editor dan menjalankan validasi, gunakan kartu Publikasi di atas untuk merilis versi pertama.
            </p>
          </div>
        ) : (
          <ul className={styles.versionTimelineList} data-testid="version-list">
            {template.versions.map((version) => (
              <li key={version.id} className={styles.versionTimelineItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={styles.versionBadgePrimary}>
                    v{version.versionNo}
                  </span>
                  <span style={{ fontSize: "0.9rem", color: "var(--dash-text)", fontWeight: 500 }}>
                    {version.note ? version.note : "Rilis reguler"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={styles.meta}>
                    {dateFormat.format(version.createdAt)}
                  </span>
                  <span
                    className={styles.fact}
                    style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                  >
                    immutable
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}


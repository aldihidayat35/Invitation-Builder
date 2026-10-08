import type { Metadata } from "next";
import Link from "next/link";
import { listLibrary, permissionsFor } from "@/features/templates/api";
import { CreateTemplateForm, ImportTemplateDialog, TemplateList } from "@/features/templates/components";
import styles from "@/features/templates/components/templates.module.css";
import { getWorkspaceContext } from "@/lib/auth/server";
import {
  archiveTemplateAction,
  createTemplateAction,
  duplicateTemplateAction,
  renameTemplateAction,
} from "./actions";

export const metadata: Metadata = { title: "Template" };

export default async function TemplateLibraryPage({
  searchParams,
}: PageProps<"/dashboard/templates">) {
  const params = await searchParams;
  const archivedView = params.view === "archived";
  const { active } = await getWorkspaceContext();

  if (!active) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Template</h1>
        <div className={styles.empty} data-testid="no-workspace">
          <p>Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang.</p>
        </div>
      </main>
    );
  }

  const workspaceId = active.workspace.id;
  const [templates, permissions] = await Promise.all([
    listLibrary(workspaceId, { archived: archivedView }),
    permissionsFor(workspaceId),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Workspace · {active.workspace.name}</p>
          <h1 className={styles.title}>Template</h1>
          <p className={styles.lead}>
            Template adalah desain undangan yang bisa dipakai berulang kali. Desain di editor, lalu
            publish — hanya template yang sudah dipublish yang bisa dipakai untuk membuat undangan.
          </p>
        </div>
      </header>

      {permissions.write && !archivedView ? (
        <div className={styles.creationRow}>
          <div style={{ flex: "1 1 540px" }}>
            <CreateTemplateForm workspaceId={workspaceId} action={createTemplateAction} />
          </div>
          <div className={styles.importSideCard}>
            <div className={styles.importSideCardHead}>
              <h3 className={styles.importSideCardTitle}>Pindahkan Template</h3>
              <p className={styles.muted}>
                Punya file template dari server atau aplikasi lain? Impor seluruh konfigurasi, tata letak, dan aset media sekaligus.
              </p>
            </div>
            <ImportTemplateDialog workspaceId={workspaceId} />
          </div>
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <nav className={styles.tabs} aria-label="Filter template">
          <Link
            href="/dashboard/templates"
            className={styles.tab}
            aria-current={archivedView ? undefined : "page"}
          >
            Aktif
          </Link>
          <Link
            href="/dashboard/templates?view=archived"
            className={styles.tab}
            aria-current={archivedView ? "page" : undefined}
          >
            Diarsipkan
          </Link>
        </nav>
        <span className={styles.count}>{templates.length} template</span>
      </div>

      <TemplateList
        templates={templates}
        canWrite={permissions.write}
        canArchive={permissions.archive}
        actions={{
          rename: renameTemplateAction,
          duplicate: duplicateTemplateAction,
          archive: archiveTemplateAction,
        }}
        emptyMessage={
          archivedView
            ? "Belum ada template yang diarsipkan."
            : "Belum ada template. Buat template pertama Anda di atas."
        }
      />
    </main>
  );
}

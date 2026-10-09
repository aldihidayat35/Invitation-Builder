import type { Metadata } from "next";
import Link from "next/link";
import { getTemplateCategories, listLibrary, permissionsFor } from "@/features/templates/api";
import {
  CreateTemplateForm,
  ImportTemplateDialog,
  TemplateList,
} from "@/features/templates/components";
import styles from "@/features/templates/components/templates.module.css";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getWorkspaceContext, requireOwner } from "@/lib/auth/server";
import {
  archiveTemplateAction,
  createTemplateAction,
  deleteTemplateAction,
  duplicateTemplateAction,
  renameTemplateAction,
} from "./actions";

export const metadata: Metadata = { title: "Template" };

export default async function TemplateLibraryPage({
  searchParams,
}: PageProps<"/dashboard/templates">) {
  await requireOwner();
  const params = await searchParams;
  const archivedView = params.view === "archived";
  const { user, active } = await getWorkspaceContext();

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
  const [templates, permissions, categories] = await Promise.all([
    listLibrary(workspaceId, { archived: archivedView }),
    permissionsFor(workspaceId),
    getTemplateCategories(),
  ]);

  const categoryNames = Object.fromEntries(categories.map((c) => [c.slug, c.name]));

  return (
    <main className={styles.page}>
      <DashboardHeroHeader
        eyebrow={
          user.systemRole === "owner"
            ? "SUPER ADMIN • KATALOG MASTER TEMPLATE"
            : `WORKSPACE • ${active.workspace.name.toUpperCase()}`
        }
        title="Katalog & Desain Template"
        description="Template adalah desain undangan yang bisa dipakai berulang kali. Desain di editor, lalu publish — hanya template yang sudah dipublish yang bisa dipakai untuk membuat undangan."
        actions={
          <div className="flex items-center gap-2.5">
            {user.systemRole === "owner" ? (
              <Link
                href="/dashboard/templates/categories"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CFC4] bg-white hover:bg-[#FAF8F5] px-4 py-2.5 text-xs font-bold text-[#5A4D44] shadow-xs transition-colors"
              >
                <span>Kelola Kategori</span>
              </Link>
            ) : null}
            <Link
              href="/dashboard/invitations"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
            >
              <span>Daftar Undangan</span>
              <span>→</span>
            </Link>
          </div>
        }
      />

      {permissions.write && !archivedView ? (
        <div className={styles.creationRow}>
          <div style={{ flex: "1 1 540px" }}>
            <CreateTemplateForm workspaceId={workspaceId} action={createTemplateAction} />
          </div>
          <div className={styles.importSideCard}>
            <div className={styles.importSideCardHead}>
              <h3 className={styles.importSideCardTitle}>Pindahkan Template</h3>
              <p className={styles.muted}>
                Punya file template dari server atau aplikasi lain? Impor seluruh konfigurasi, tata
                letak, dan aset media sekaligus.
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
        canDelete={permissions.archive}
        actions={{
          rename: renameTemplateAction,
          duplicate: duplicateTemplateAction,
          archive: archiveTemplateAction,
          delete: deleteTemplateAction,
        }}
        categoryNames={categoryNames}
        emptyMessage={
          archivedView
            ? "Belum ada template yang diarsipkan."
            : "Belum ada template. Buat template pertama Anda di atas."
        }
      />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { listLibrary, permissionsFor } from "@/features/templates/api";
import { CreateTemplateForm, TemplateList } from "@/features/templates/components";
import styles from "@/features/templates/components/templates.module.css";
import { getWorkspaceContext } from "@/lib/auth/server";
import {
  archiveTemplateAction,
  createTemplateAction,
  duplicateTemplateAction,
  renameTemplateAction,
} from "./actions";

export const metadata: Metadata = { title: "Template Library" };

export default async function TemplateLibraryPage({
  searchParams,
}: PageProps<"/dashboard/templates">) {
  const params = await searchParams;
  const archivedView = params.view === "archived";
  const { active } = await getWorkspaceContext();

  if (!active) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Template Library</h1>
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
        <div>
          <p className={styles.eyebrow}>{active.workspace.name}</p>
          <h1 className={styles.title}>Template Library</h1>
        </div>
      </header>

      {permissions.write && !archivedView ? (
        <CreateTemplateForm workspaceId={workspaceId} action={createTemplateAction} />
      ) : null}

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

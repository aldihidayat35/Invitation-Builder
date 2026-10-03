import type { Metadata } from "next";
import Link from "next/link";
import { listAll, permissionsFor } from "@/features/invitations/api";
import { CreateInvitationForm } from "@/features/invitations/components/CreateInvitationForm";
import { InvitationList } from "@/features/invitations/components/InvitationList";
import styles from "@/features/invitations/components/invitations.module.css";
import { listLibrary } from "@/features/templates/api";
import { getWorkspaceContext } from "@/lib/auth/server";
import { createInvitationAction } from "./actions";

export const metadata: Metadata = { title: "Undangan" };

export default async function InvitationsPage({
  searchParams,
}: PageProps<"/dashboard/invitations">) {
  const params = await searchParams;
  const archivedView = params.view === "archived";
  const { active } = await getWorkspaceContext();

  if (!active) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Undangan</h1>
        <div className={styles.empty} data-testid="no-workspace">
          <p>Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang.</p>
        </div>
      </main>
    );
  }

  const workspaceId = active.workspace.id;
  const [invitations, permissions, templates] = await Promise.all([
    listAll(workspaceId, { archived: archivedView }),
    permissionsFor(workspaceId),
    listLibrary(workspaceId),
  ]);
  const published = templates
    .filter((template) => template.publishedVersionNo !== null)
    .map((template) => ({
      id: template.id,
      name: template.name,
      versionNo: template.publishedVersionNo ?? 0,
    }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Workspace · {active.workspace.name}</p>
          <h1 className={styles.title}>Undangan</h1>
          <p className={styles.lead}>
            Undangan adalah salinan template untuk satu acara klien. Di sini Anda mengisi data
            acara, mengelola daftar tamu, lalu mempublish link yang dibagikan ke tamu.
          </p>
        </div>
      </header>

      {!archivedView ? (
        <ol className={styles.steps} aria-label="Alur membuat undangan">
          <li className={styles.step}>
            <strong>Pilih template</strong>
            <span>Gunakan template yang sudah dipublish.</span>
          </li>
          <li className={styles.step}>
            <strong>Isi data &amp; tamu</strong>
            <span>Nama mempelai, tanggal, lokasi, dan daftar tamu.</span>
          </li>
          <li className={styles.step}>
            <strong>Publish &amp; bagikan</strong>
            <span>Kirim link undangan dan pantau RSVP.</span>
          </li>
        </ol>
      ) : null}

      {permissions.write && !archivedView ? (
        <CreateInvitationForm
          workspaceId={workspaceId}
          templates={published}
          action={createInvitationAction}
        />
      ) : null}

      <div className={styles.toolbar}>
        <nav className={styles.row} aria-label="Filter undangan">
          <Link
            href="/dashboard/invitations"
            className={styles.chip}
            aria-current={archivedView ? undefined : "true"}
          >
            Aktif
          </Link>
          <Link
            href="/dashboard/invitations?view=archived"
            className={styles.chip}
            aria-current={archivedView ? "true" : undefined}
          >
            Diarsipkan
          </Link>
        </nav>
        <span className={styles.count}>{invitations.length} undangan</span>
      </div>

      <InvitationList
        invitations={invitations}
        emptyMessage={
          archivedView
            ? "Belum ada undangan yang diarsipkan."
            : "Belum ada undangan. Buat undangan pertama dari template yang sudah dipublish."
        }
      />
    </main>
  );
}

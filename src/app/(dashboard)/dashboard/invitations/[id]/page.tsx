import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { searchAssets } from "@/features/assets/api";
import {
  InvitationNotFoundError,
  listGuests,
  open,
  permissionsFor,
  readiness,
  snapshots as listSnapshots,
} from "@/features/invitations/api";
import { DataModeForm } from "@/features/invitations/components/DataModeForm";
import { GuestImport } from "@/features/invitations/components/GuestImport";
import { GuestPanel } from "@/features/invitations/components/GuestPanel";
import { PublishPanel } from "@/features/invitations/components/PublishPanel";
import styles from "@/features/invitations/components/invitations.module.css";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getWorkspaceContext } from "@/lib/auth/server";
import { buildFormFields, formatFormValue, groupFormFields } from "@/lib/engine";
import {
  addGuestAction,
  archiveGuestAction,
  importGuestsAction,
  publishInvitationAction,
  rollbackInvitationAction,
  saveInvitationDataAction,
} from "../actions";

export const metadata: Metadata = { title: "Data undangan" };

export default async function InvitationDataPage({
  params,
}: PageProps<"/dashboard/invitations/[id]">) {
  const { id } = await params;
  const { user } = await getWorkspaceContext();
  const canManagePublication = user.systemRole === "owner";

  let invitation;
  try {
    invitation = await open(id);
  } catch (error) {
    // Cross-workspace and missing ids are indistinguishable by design.
    if (error instanceof InvitationNotFoundError) notFound();
    throw error;
  }

  const [permissions, guests, report, assets, snapshots] = await Promise.all([
    permissionsFor(invitation.workspaceId),
    listGuests(invitation.id),
    readiness(invitation.id),
    searchAssets(invitation.workspaceId).catch(() => []),
    canManagePublication ? listSnapshots(invitation.id) : Promise.resolve([]),
  ]);

  const fields = buildFormFields(invitation.document.variables);
  const groups = groupFormFields(fields);
  const values: Record<string, string> = {};
  for (const field of fields) {
    values[field.key] = formatFormValue(field, invitation.data[field.key]);
  }
  const errors: Record<string, string> = {};
  for (const issue of report.issues) {
    if (!(issue.key in errors)) errors[issue.key] = issue.message;
  }
  const imageAssets = assets.filter((asset) => asset.mimeType.startsWith("image/"));
  const imageOptions = imageAssets.map((asset) => ({ id: asset.id, label: asset.filename }));
  const archived = invitation.status === "archived";

  return (
    <main className={styles.page}>
      <Link href="/dashboard/invitations" className={styles.breadcrumb}>
        ← Undangan
      </Link>
      <div className="mb-6">
        <DashboardHeroHeader
          eyebrow={`TEMPLATE: ${invitation.template.name.toUpperCase()} • V${invitation.template.versionNo}`}
          title={<span data-testid="invitation-title">{invitation.title}</span>}
          description="Isi dan sesuaikan data undangan pernikahan digital seperti nama mempelai, jadwal acara akad dan resepsi, lokasi, serta daftar tamu VIP."
          actions={
            <div className="flex items-center gap-2.5">
              <Link
                href={`/dashboard/invitations/${invitation.id}/rsvp`}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
                id="open-rsvp"
              >
                <span>Buku Tamu RSVP</span>
              </Link>
              <Link
                href={`/dashboard/invitations/${invitation.id}/preview`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
                id="open-preview"
              >
                <span>Preview Undangan</span>
                <span>↗</span>
              </Link>
            </div>
          }
        />
      </div>

      <div className={styles.layout}>
        <div>
          {groups.length === 0 ? (
            <div className={styles.empty}>
              <p>Template ini tidak memiliki variabel yang perlu diisi.</p>
            </div>
          ) : (
            <DataModeForm
              invitationId={invitation.id}
              workspaceId={invitation.workspaceId}
              groups={groups}
              values={values}
              initialErrors={errors}
              imageOptions={imageOptions}
              initialAssets={imageAssets}
              save={saveInvitationDataAction}
              readOnly={archived || !permissions.write}
            />
          )}
        </div>
        <aside aria-label="Status dan tamu">
          <section className={styles.panel} aria-labelledby="readiness-title">
            <h2 id="readiness-title" className={styles.panelTitle}>
              Kesiapan publish
            </h2>
            {report.ready ? (
              <p className={styles.okText} data-testid="readiness-ok">
                Semua data wajib sudah terisi.
              </p>
            ) : (
              <ul className={styles.issues} data-testid="readiness-issues">
                {report.issues.map((issue) => (
                  <li key={`${issue.key}-${issue.code}`}>{issue.message}</li>
                ))}
              </ul>
            )}
          </section>
          {canManagePublication ? (
            <PublishPanel
              invitationId={invitation.id}
              slug={invitation.slug}
              status={invitation.status}
              ready={report.ready}
              canWrite={permissions.write}
              snapshots={snapshots}
              publish={publishInvitationAction}
              rollback={rollbackInvitationAction}
            />
          ) : (
            <section className={styles.panel} aria-labelledby="publication-owner-title">
              <h2 id="publication-owner-title" className={styles.panelTitle}>
                Status publikasi
              </h2>
              <p className="text-sm leading-6 text-stone-600">
                {invitation.status === "published"
                  ? "Undangan ini sudah live. Perubahan data berikutnya akan diperiksa dan diterbitkan kembali oleh tim produksi."
                  : "Setelah data lengkap dan preview sudah sesuai, tim produksi akan memeriksa lalu menerbitkan undangan Anda."}
              </p>
            </section>
          )}
          <GuestPanel
            invitationId={invitation.id}
            guests={guests}
            canWrite={permissions.write && !archived}
            add={addGuestAction}
            archive={archiveGuestAction}
          />
          {permissions.write && !archived ? (
            <GuestImport invitationId={invitation.id} action={importGuestsAction} />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

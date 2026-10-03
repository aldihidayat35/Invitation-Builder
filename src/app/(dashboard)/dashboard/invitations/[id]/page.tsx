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
} from "@/features/invitations/api";
import { DataModeForm } from "@/features/invitations/components/DataModeForm";
import { GuestPanel } from "@/features/invitations/components/GuestPanel";
import styles from "@/features/invitations/components/invitations.module.css";
import { buildFormFields, formatFormValue, groupFormFields } from "@/lib/engine";
import { addGuestAction, archiveGuestAction, saveInvitationDataAction } from "../actions";

export const metadata: Metadata = { title: "Data undangan" };

export default async function InvitationDataPage({
  params,
}: PageProps<"/dashboard/invitations/[id]">) {
  const { id } = await params;

  let invitation;
  try {
    invitation = await open(id);
  } catch (error) {
    // Cross-workspace and missing ids are indistinguishable by design.
    if (error instanceof InvitationNotFoundError) notFound();
    throw error;
  }

  const [permissions, guests, report, assets] = await Promise.all([
    permissionsFor(invitation.workspaceId),
    listGuests(invitation.id),
    readiness(invitation.id),
    searchAssets(invitation.workspaceId).catch(() => []),
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
  const imageOptions = assets
    .filter((asset) => asset.mimeType.startsWith("image/"))
    .map((asset) => ({ id: asset.id, label: asset.filename }));
  const archived = invitation.status === "archived";

  return (
    <main className={styles.page}>
      <Link href="/dashboard/invitations" className={styles.breadcrumb}>
        ← Undangan
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Template: {invitation.template.name} · v{invitation.template.versionNo}
          </p>
          <h1 className={styles.title} data-testid="invitation-title">
            {invitation.title}
          </h1>
        </div>
        <Link
          href={`/dashboard/invitations/${invitation.id}/preview`}
          className={styles.primary}
          id="open-preview"
        >
          Preview
        </Link>
      </header>

      <div className={styles.layout}>
        <div>
          {groups.length === 0 ? (
            <div className={styles.empty}>
              <p>Template ini tidak memiliki variabel yang perlu diisi.</p>
            </div>
          ) : (
            <DataModeForm
              invitationId={invitation.id}
              groups={groups}
              values={values}
              initialErrors={errors}
              imageOptions={imageOptions}
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
          <GuestPanel
            invitationId={invitation.id}
            guests={guests}
            canWrite={permissions.write && !archived}
            add={addGuestAction}
            archive={archiveGuestAction}
          />
        </aside>
      </div>
    </main>
  );
}

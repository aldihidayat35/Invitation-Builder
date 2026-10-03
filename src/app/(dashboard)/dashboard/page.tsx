import type { Metadata } from "next";
import Link from "next/link";
import { listAll } from "@/features/invitations/api";
import type { InvitationSummary } from "@/features/invitations/types";
import { listLibrary } from "@/features/templates/api";
import type { TemplateSummary } from "@/features/templates/types";
import { getWorkspaceContext } from "@/lib/auth/server";
import { IconArrowRight, IconInvitation, IconPlus, IconTemplate } from "./nav-icons";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Ringkasan",
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

const TEMPLATE_STATUS: Record<TemplateSummary["lifecycle"], { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "warning" },
  published: { label: "Dipublish", tone: "success" },
  "published-with-changes": { label: "Ada perubahan", tone: "accent" },
  archived: { label: "Diarsipkan", tone: "neutral" },
};

const INVITATION_STATUS: Record<InvitationSummary["status"], { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "warning" },
  published: { label: "Dipublish", tone: "success" },
  archived: { label: "Diarsipkan", tone: "neutral" },
};

const WORKFLOW = [
  {
    title: "Desain template",
    body: "Buat template dan atur tata letak, teks, gambar, animasi, serta widget di editor.",
  },
  {
    title: "Publish template",
    body: "Publish agar template terkunci sebagai versi resmi yang bisa dipakai untuk undangan.",
  },
  {
    title: "Buat undangan",
    body: "Pilih template yang sudah dipublish, lalu isi data acara dan daftar tamu.",
  },
  {
    title: "Bagikan & pantau",
    body: "Publish undangan, bagikan link ke tamu, dan pantau konfirmasi kehadiran (RSVP).",
  },
] as const;

const byUpdated = <T extends { updatedAt: Date }>(a: T, b: T) =>
  b.updatedAt.getTime() - a.updatedAt.getTime();

/** Workspace overview: what the app is for, the workflow, key numbers and recent work. */
export default async function DashboardPage() {
  const { user, active } = await getWorkspaceContext();
  const [templates, invitations] = active
    ? await Promise.all([listLibrary(active.workspace.id), listAll(active.workspace.id)])
    : [[], []];

  const publishedTemplates = templates.filter((t) => t.publishedVersionNo !== null).length;
  const draftTemplates = templates.filter((t) => t.lifecycle === "draft").length;
  const publishedInvitations = invitations.filter((i) => i.status === "published").length;
  const recentTemplates = [...templates].sort(byUpdated).slice(0, 5);
  const recentInvitations = [...invitations].sort(byUpdated).slice(0, 5);

  const stats = [
    { label: "Template", value: templates.length, note: `${draftTemplates} masih draft` },
    { label: "Template dipublish", value: publishedTemplates, note: "Siap dipakai undangan" },
    { label: "Undangan", value: invitations.length, note: "Semua undangan aktif" },
    { label: "Undangan dipublish", value: publishedInvitations, note: "Link sudah bisa dibagikan" },
  ];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>
            {active ? `Workspace · ${active.workspace.name}` : "Tanpa workspace"}
          </p>
          <h1 className={styles.title}>Ringkasan</h1>
          <p className={styles.lead}>
            Selamat datang, {user.name}. Aplikasi ini dipakai untuk mendesain template undangan
            digital, lalu membuat undangan untuk klien dari template tersebut dan membagikannya ke
            para tamu.
          </p>
        </div>
        {active ? (
          <div className={styles.headerActions}>
            <Link
              href="/dashboard/templates"
              className={styles.secondary}
              id="open-template-library"
            >
              <IconPlus />
              Template baru
            </Link>
            <Link href="/dashboard/invitations" className={styles.primary}>
              <IconPlus />
              Undangan baru
            </Link>
          </div>
        ) : null}
      </header>

      {!active ? (
        <div className={styles.notice} data-testid="no-workspace">
          Akun Anda belum tergabung di workspace mana pun. Hubungi admin untuk diundang.
        </div>
      ) : null}

      <section aria-labelledby="stats-heading" className={styles.section}>
        <h2 id="stats-heading" className={styles.srOnly}>
          Angka utama
        </h2>
        <ul className={styles.stats}>
          {stats.map((stat) => (
            <li key={stat.label} className={styles.stat}>
              <span className={styles.statLabel}>{stat.label}</span>
              <strong className={styles.statValue}>{stat.value}</strong>
              <span className={styles.statNote}>{stat.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="workflow-heading" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="workflow-heading" className={styles.sectionTitle}>
            Cara kerja
          </h2>
          <p className={styles.sectionLead}>Empat langkah dari desain sampai undangan terkirim.</p>
        </div>
        <ol className={styles.workflow}>
          {WORKFLOW.map((step, index) => (
            <li key={step.title} className={styles.workflowStep}>
              <span className={styles.stepNo} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.columns}>
        <section aria-labelledby="recent-templates-heading" className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 id="recent-templates-heading" className={styles.panelTitle}>
              <IconTemplate />
              Template terbaru
            </h2>
            <Link href="/dashboard/templates" className={styles.panelLink}>
              Lihat semua <IconArrowRight />
            </Link>
          </div>
          {recentTemplates.length === 0 ? (
            <p className={styles.emptyRow}>Belum ada template. Mulai dengan membuat template.</p>
          ) : (
            <ul className={styles.rows}>
              {recentTemplates.map((template) => {
                const status = TEMPLATE_STATUS[template.lifecycle];
                return (
                  <li key={template.id} className={styles.rowItem}>
                    <Link href={`/dashboard/templates/${template.id}`} className={styles.rowName}>
                      {template.name}
                    </Link>
                    <span className={styles.pill} data-tone={status.tone}>
                      {status.label}
                    </span>
                    <span className={styles.rowMeta}>{dateFormat.format(template.updatedAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-invitations-heading" className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 id="recent-invitations-heading" className={styles.panelTitle}>
              <IconInvitation />
              Undangan terbaru
            </h2>
            <Link href="/dashboard/invitations" className={styles.panelLink}>
              Lihat semua <IconArrowRight />
            </Link>
          </div>
          {recentInvitations.length === 0 ? (
            <p className={styles.emptyRow}>
              Belum ada undangan. Undangan dibuat dari template yang sudah dipublish.
            </p>
          ) : (
            <ul className={styles.rows}>
              {recentInvitations.map((invitation) => {
                const status = INVITATION_STATUS[invitation.status];
                return (
                  <li key={invitation.id} className={styles.rowItem}>
                    <Link
                      href={`/dashboard/invitations/${invitation.id}`}
                      className={styles.rowName}
                    >
                      {invitation.title}
                    </Link>
                    <span className={styles.pill} data-tone={status.tone}>
                      {status.label}
                    </span>
                    <span className={styles.rowMeta}>
                      {dateFormat.format(invitation.updatedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className={styles.devTools}>
        <span>Alat teknis:</span>
        <Link href="/smoke/renderer" id="open-renderer-smoke">
          Uji public renderer
        </Link>
        {process.env.NODE_ENV !== "production" ? (
          <Link href="/dashboard/playground">Engine playground</Link>
        ) : null}
      </footer>
    </main>
  );
}

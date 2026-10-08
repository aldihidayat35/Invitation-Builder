import Link from "next/link";
import type { InvitationSummary } from "@/features/invitations/types";
import { DashboardHeroHeader } from "./DashboardHeroHeader";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export function ClientDashboard({
  userName,
  workspaceName,
  invitations,
}: {
  userName: string;
  workspaceName?: string;
  invitations: readonly InvitationSummary[];
}) {
  const activeInvitations = invitations.filter((item) => item.status !== "archived");
  const published = activeInvitations.filter((item) => item.status === "published");
  const drafts = activeInvitations.filter((item) => item.status === "draft");
  const nextInvitation = drafts[0] ?? published[0];

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow={`AREA MEMPELAI${workspaceName ? ` • ${workspaceName.toUpperCase()}` : ""}`}
        title={`Selamat datang, ${userName}`}
        description="Lengkapi data acara, periksa tampilan undangan, kelola daftar tamu, dan pantau RSVP dari satu tempat. Desain dan publikasi ditangani oleh tim produksi."
        actions={
          nextInvitation ? (
            <Link
              href={`/dashboard/invitations/${nextInvitation.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors hover:bg-[#BD9B2F]"
            >
              {nextInvitation.status === "draft" ? "Lanjutkan isi data" : "Kelola undangan"}
            </Link>
          ) : null
        }
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Ringkasan undangan saya"
      >
        <SummaryCard label="Total Undangan" value={activeInvitations.length} tone="stone" />
        <SummaryCard label="Perlu Dilengkapi" value={drafts.length} tone="amber" />
        <SummaryCard label="Sudah Live" value={published.length} tone="emerald" />
      </section>

      {activeInvitations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-10 text-center shadow-xs sm:px-8">
          <h2 className="text-base font-bold text-[#2C221E]">Proyek undangan belum tersedia</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">
            Hubungi seller atau admin yang menangani pesanan Anda. Setelah proyek dibuat, undangan
            akan muncul otomatis di halaman ini.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#84633F]">
                Proyek Anda
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#2C221E]">
                Undangan yang sedang dikelola
              </h2>
            </div>
            <Link
              href="/dashboard/invitations"
              className="text-xs font-bold text-[#84633F] hover:underline"
            >
              Lihat semua undangan →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeInvitations.slice(0, 4).map((invitation) => (
              <article
                key={invitation.id}
                className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[#2C221E]">
                      {invitation.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-stone-500">
                      Diperbarui {dateFormat.format(invitation.updatedAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      invitation.status === "published"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {invitation.status === "published" ? "Live" : "Lengkapi data"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Link
                    href={`/dashboard/invitations/${invitation.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#84633F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#715332]"
                  >
                    Isi data
                  </Link>
                  <Link
                    href={`/dashboard/invitations/${invitation.id}/preview`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/dashboard/invitations/${invitation.id}/rsvp`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    RSVP
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Alur kerja klien">
        <Step
          number="1"
          title="Lengkapi data"
          description="Isi nama, jadwal, lokasi, foto, dan informasi acara."
        />
        <Step
          number="2"
          title="Periksa preview"
          description="Pastikan seluruh informasi tampil benar sebelum diterbitkan."
        />
        <Step
          number="3"
          title="Kelola tamu"
          description="Bagikan tautan dan pantau konfirmasi kehadiran tamu."
        />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "stone" | "amber" | "emerald";
}) {
  const tones = {
    stone: "border-stone-200 bg-white text-stone-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-xs ${tones[tone]}`}>
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E9D2] text-xs font-black text-[#84633F]">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-bold text-[#2C221E]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
      </div>
    </div>
  );
}

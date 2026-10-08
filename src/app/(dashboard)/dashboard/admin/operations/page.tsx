import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getAdminOperations } from "@/features/operations/api";
import {
  activateDomainTlsAction,
  recordRecoveryDrillAction,
  resolvePrivacyRequestAction,
} from "./actions";

export const metadata: Metadata = { title: "Operasional platform" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function safeDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDate(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "—";
}

export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = first(query.q);
  const action = first(query.action);
  const data = await getAdminOperations({
    query: q || undefined,
    action: action || undefined,
    from: safeDate(first(query.from)),
    to: safeDate(first(query.to)),
    limit: 150,
  });

  return (
    <main className="grid gap-6">
      <DashboardHeroHeader
        eyebrow="OPERATIONS CONTROL CENTER"
        title="Keamanan, SLA, Privasi & Recovery"
        description="Pantau sinyal keamanan, antrean produksi, jejak audit, domain, permintaan privasi, dan bukti restore drill dari satu halaman."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Failed login 24 jam", data.security.failedLogins],
          ["Terkena rate limit", data.security.rateLimited],
          ["Order melewati SLA", data.queue.overdue],
          ["Produksi belum ditugaskan", data.queue.unassigned],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-stone-900">Antrean produksi & bottleneck</h2>
            <p className="text-sm text-stone-500">
              SLA awal: due dalam 24 jam ditandai prioritas, due terlewat dianggap overdue.
            </p>
          </div>
          <Link href="/dashboard/admin/orders" className="text-sm font-bold text-[#84633F]">
            Buka seluruh order →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-stone-500">
                <th className="p-2">Customer</th>
                <th className="p-2">Seller</th>
                <th className="p-2">Tahap</th>
                <th className="p-2">Assignee</th>
                <th className="p-2">Due</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.rows.map(({ order, sellerName, assigneeName }) => {
                const overdue = order.dueAt ? order.dueAt < data.generatedAt : false;
                return (
                  <tr key={order.id} className="border-b border-stone-100">
                    <td className="p-2 font-semibold">{order.customerName}</td>
                    <td className="p-2">{sellerName}</td>
                    <td className="p-2 capitalize">
                      {order.productionStatus.replaceAll("_", " ")}
                    </td>
                    <td className="p-2">{assigneeName ?? "Belum ditugaskan"}</td>
                    <td className={`p-2 ${overdue ? "font-bold text-rose-700" : ""}`}>
                      {formatDate(order.dueAt)}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/dashboard/admin/orders/${order.id}`}
                        className="font-semibold text-[#84633F]"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.queue.rows.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            Tidak ada order aktif dalam antrean produksi.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Sinyal keamanan 24 jam</h2>
          <p className="mt-1 text-sm text-stone-500">
            Identitas email dan alamat klien disimpan sebagai hash, bukan nilai mentah.
          </p>
          <div className="mt-4 grid gap-2">
            {data.security.recent.map((event) => (
              <div key={event.id} className="rounded-xl bg-stone-50 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <strong>{event.eventType}</strong>
                  <span
                    className={event.severity === "critical" ? "text-rose-700" : "text-amber-700"}
                  >
                    {event.severity}
                  </span>
                </div>
                <time className="text-xs text-stone-500">{formatDate(event.createdAt)}</time>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Domain & TLS</h2>
          <div className="mt-4 grid gap-3">
            {data.domains.map((domain) => (
              <div
                key={domain.profileId}
                className="rounded-xl border border-stone-100 p-3 text-sm"
              >
                <strong>{domain.agencyName}</strong>
                <p>{domain.domain}</p>
                <p className="text-stone-500">
                  DNS: {domain.domainStatus} · TLS: {domain.tlsStatus}
                </p>
                {domain.domainStatus === "verified" && domain.tlsStatus !== "active" ? (
                  <form action={activateDomainTlsAction} className="mt-2">
                    <input type="hidden" name="profileId" value={domain.profileId} />
                    <button className="min-h-10 rounded-lg bg-emerald-700 px-4 font-bold text-white">
                      Konfirmasi TLS Aktif
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">Permintaan privasi</h2>
        <div className="mt-4 grid gap-3">
          {data.privacy.map(({ request, targetName, targetEmail }) => (
            <article
              key={request.id}
              className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {targetName} · {targetEmail}
                </strong>
                <span className="capitalize">
                  {request.requestType} / {request.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-stone-600">{request.reason || "Tanpa penjelasan"}</p>
              {request.retentionDueAt ? (
                <p
                  className={`mt-1 text-xs ${
                    request.retentionDueAt < data.generatedAt &&
                    request.status !== "completed" &&
                    request.status !== "rejected"
                      ? "font-bold text-rose-700"
                      : "text-stone-500"
                  }`}
                >
                  Batas review: {formatDate(request.retentionDueAt)}
                </p>
              ) : null}
              {request.status === "pending" || request.status === "in_progress" ? (
                <form
                  action={resolvePrivacyRequestAction}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                >
                  <input type="hidden" name="id" value={request.id} />
                  <select name="status" className="min-h-10 rounded-lg border px-2">
                    <option value="in_progress">Proses</option>
                    <option value="completed">Selesai</option>
                    <option value="rejected">Tolak</option>
                  </select>
                  <input
                    name="resolutionNote"
                    required
                    minLength={3}
                    placeholder="Catatan keputusan wajib"
                    className="min-h-10 rounded-lg border px-3"
                  />
                  <button className="rounded-lg bg-stone-800 px-4 font-bold text-white">
                    Simpan
                  </button>
                </form>
              ) : (
                <p className="mt-2">Tanggapan: {request.resolutionNote}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Audit log searchable</h2>
          <form className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari actor, aksi, entitas…"
              className="min-h-10 rounded-lg border px-3 sm:col-span-2"
            />
            <input
              name="action"
              defaultValue={action}
              placeholder="Aksi exact"
              className="min-h-10 rounded-lg border px-3"
            />
            <button className="rounded-lg bg-[#84633F] px-4 font-bold text-white">Filter</button>
          </form>
          <div className="mt-4 max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b uppercase text-stone-500">
                  <th className="p-2">Waktu</th>
                  <th className="p-2">Actor</th>
                  <th className="p-2">Aksi</th>
                  <th className="p-2">Entitas</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map(({ audit, actorName, actorEmail }) => (
                  <tr key={audit.id} className="border-b border-stone-100">
                    <td className="p-2">{formatDate(audit.createdAt)}</td>
                    <td className="p-2">
                      {actorName ?? "Sistem"}
                      <br />
                      <span className="text-stone-400">{actorEmail}</span>
                    </td>
                    <td className="p-2 font-semibold">{audit.action}</td>
                    <td className="p-2">
                      {audit.entityType} · {audit.entityId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Catat recovery drill</h2>
          <form action={recordRecoveryDrillAction} className="mt-4 grid gap-3 text-sm">
            <select name="drillType" className="min-h-10 rounded-lg border px-2">
              <option value="restore">Restore</option>
              <option value="backup">Backup</option>
              <option value="failover">Failover</option>
            </select>
            <select name="status" className="min-h-10 rounded-lg border px-2">
              <option value="planned">Direncanakan</option>
              <option value="running">Berjalan</option>
              <option value="passed">Lulus</option>
              <option value="failed">Gagal</option>
            </select>
            <input
              name="environment"
              required
              placeholder="Lingkungan staging/DR"
              className="min-h-10 rounded-lg border px-3"
            />
            <input
              name="backupReference"
              placeholder="Referensi backup/tiket"
              className="min-h-10 rounded-lg border px-3"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="measuredRpoMinutes"
                type="number"
                min="0"
                placeholder="RPO menit"
                className="min-h-10 rounded-lg border px-3"
              />
              <input
                name="measuredRtoMinutes"
                type="number"
                min="0"
                placeholder="RTO menit"
                className="min-h-10 rounded-lg border px-3"
              />
            </div>
            <textarea
              name="notes"
              placeholder="Hasil dan masalah ditemukan"
              className="rounded-lg border px-3 py-2"
            />
            <button className="min-h-10 rounded-lg bg-stone-800 px-4 font-bold text-white">
              Catat Drill
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {data.drills.slice(0, 8).map((drill) => (
              <div key={drill.id} className="rounded-lg bg-stone-50 p-3 text-xs">
                <strong>
                  {drill.drillType} · {drill.status}
                </strong>
                <p>
                  {drill.environment} · RPO {drill.measuredRpoMinutes ?? "—"} / RTO{" "}
                  {drill.measuredRtoMinutes ?? "—"} menit
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

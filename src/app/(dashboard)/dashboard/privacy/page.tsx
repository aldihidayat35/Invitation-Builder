import type { Metadata } from "next";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { getMyPrivacyRequests } from "@/features/operations/api";
import { submitPrivacyRequestAction } from "./actions";

export const metadata: Metadata = { title: "Privasi dan data pribadi" };

export default async function PrivacyPage() {
  const requests = await getMyPrivacyRequests();
  return (
    <main className="grid gap-6">
      <DashboardHeroHeader
        eyebrow="PRIVASI & RETENSI DATA"
        title="Kendali Data Pribadi"
        description="Ajukan salinan data atau permintaan penghapusan. Penghapusan ditinjau agar order aktif, bukti transaksi, dan audit legal tidak rusak."
      />
      <section className="grid gap-5 lg:grid-cols-2">
        <form
          action={submitPrivacyRequestAction}
          className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5"
        >
          <h2 className="font-bold text-stone-900">Buat permintaan</h2>
          <label className="grid gap-1.5 text-sm font-semibold">
            Jenis permintaan
            <select name="requestType" className="min-h-11 rounded-xl border border-stone-200 px-3">
              <option value="export">Salinan data pribadi</option>
              <option value="delete">Penghapusan atau anonimisasi</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Penjelasan
            <textarea
              name="reason"
              rows={4}
              maxLength={1000}
              className="rounded-xl border border-stone-200 px-3 py-2"
            />
          </label>
          <button className="min-h-11 rounded-xl bg-[#84633F] px-5 text-sm font-bold text-white">
            Kirim Permintaan
          </button>
        </form>
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900">Kebijakan awal</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-600">
            <li>Permintaan ekspor ditargetkan selesai maksimal 7 hari kerja.</li>
            <li>Permintaan penghapusan memiliki masa tinjau 30 hari.</li>
            <li>
              Audit keamanan dan bukti transaksi dapat dipertahankan dalam bentuk teranonimisasi.
            </li>
            <li>
              Order aktif harus diselesaikan atau dibatalkan sebelum data operasional dihapus.
            </li>
          </ul>
        </section>
      </section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">Riwayat permintaan</h2>
        <div className="mt-4 grid gap-3">
          {requests.length ? (
            requests.map(({ request }) => (
              <article
                key={request.id}
                className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="capitalize">{request.requestType}</strong>
                  <span className="capitalize">{request.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-1 text-stone-600">
                  Diajukan{" "}
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                    request.createdAt,
                  )}
                </p>
                {request.resolutionNote ? (
                  <p className="mt-2">Tanggapan: {request.resolutionNote}</p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm text-stone-500">Belum ada permintaan privasi.</p>
          )}
        </div>
      </section>
    </main>
  );
}

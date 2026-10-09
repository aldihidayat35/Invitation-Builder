"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { AppSettingsData } from "@/features/dashboard-layout";
import { submitPlatformOrderAction, type PlatformOrderActionState } from "../actions";

export interface PublicTemplateDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  thumbnailUrl: string;
  previewUrl?: string;
  features: string[];
  palette: Array<{ name: string; hex: string }>;
}

interface TemplateDetailViewProps {
  template: PublicTemplateDetail;
  appSettings?: AppSettingsData | null;
  autoOpenOrder?: boolean;
}

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export function TemplateDetailView({
  template,
  appSettings,
  autoOpenOrder = false,
}: TemplateDetailViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(autoOpenOrder);
  const [orderSuccess, setOrderSuccess] = useState<PlatformOrderActionState | null>(null);

  const [state, formAction, isPending] = useActionState<PlatformOrderActionState, FormData>(
    async (prev, formData) => {
      const res = await submitPlatformOrderAction(prev, formData);
      if (res.ok && res.whatsappUrl) {
        setOrderSuccess(res);
        // Automatically attempt to open WhatsApp in a new tab
        try {
          window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
        } catch {
          // If popup blocked, user can click manual button
        }
      }
      return res;
    },
    {},
  );

  const adminPhone = (appSettings?.contactWhatsapp || "6281234567890").replace(/\D/g, "");
  const cleanAdminPhone = adminPhone.startsWith("0") ? "62" + adminPhone.slice(1) : adminPhone;
  const adminConsultUrl = `https://wa.me/${cleanAdminPhone}?text=${encodeURIComponent(
    `Halo Admin ${appSettings?.appName || "Undangan.id"}, saya ingin konsultasi mengenai template "${template.name}".`,
  )}`;

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#2C221E] font-sans antialiased selection:bg-[#E8C587] selection:text-[#2C221E]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#EADFCF] bg-[#FBF9F5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-xs font-semibold text-[#8C5D2A] transition hover:text-[#5E3911]"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[#DFCBB5] bg-white text-sm transition group-hover:-translate-x-0.5 group-hover:border-[#8C5D2A]">
              ←
            </span>
            <span className="hidden sm:inline">Kembali ke Katalog Utama</span>
            <span className="sm:hidden">Katalog</span>
          </Link>

          <Link href="/" className="font-serif text-lg font-bold tracking-tight text-[#2C221E]">
            {appSettings?.appName || "Undangan.id"}
          </Link>

          <a
            href={adminConsultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D5C2AA] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#664624] shadow-2xs transition hover:border-[#8C5D2A] hover:bg-[#FAF4EC]"
          >
            <span className="text-emerald-600 font-bold">💬</span>
            <span className="hidden sm:inline">Tanya Admin CS</span>
            <span className="sm:hidden">CS</span>
          </a>
        </div>
      </header>

      {/* Breadcrumb Section */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-5 text-xs text-[#8F8175] sm:px-6">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-[#664624] hover:underline">
              Beranda
            </Link>
          </li>
          <li>›</li>
          <li>
            <Link href="/#template" className="hover:text-[#664624] hover:underline">
              Katalog
            </Link>
          </li>
          <li>›</li>
          <li>
            <span className="font-semibold text-[#2C221E]">{template.name}</span>
          </li>
        </ol>
      </nav>

      {/* Main Product Detail Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 items-start">
          {/* Left Column: Visual Preview / Mockup */}
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-[#E8DEC8] bg-[#EFE9DF] p-3 shadow-md sm:p-5">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white shadow-inner sm:aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.thumbnailUrl}
                  alt={`Preview template ${template.name}`}
                  className="h-full w-full object-cover object-top transition duration-500 hover:scale-[1.02]"
                />

                <div className="absolute top-4 left-4 rounded-full bg-[#2C221E]/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                  {template.category}
                </div>
              </div>

              {/* Action Buttons under Preview */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 text-xs text-[#7F6B58]">
                  <span>✨ Resolusi Full HD</span>
                  <span>•</span>
                  <span>📱 Responsif Smartphone</span>
                </div>

                {template.previewUrl && (
                  <a
                    href={template.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#925003] bg-white px-4 py-2 text-xs font-bold text-[#925003] shadow-2xs transition hover:bg-[#925003] hover:text-white"
                  >
                    <span>Buka Live Preview</span>
                    <span className="font-bold">↗</span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Right Column: Template Info & Order CTA */}
          <section className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#F2E5D0] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#925003]">
                  {template.category}
                </span>
                <span className="text-xs font-semibold text-[#8F7D6D]">
                  ⭐ 4.9/5 (100+ ulasan puas)
                </span>
              </div>

              <h1 className="font-serif mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-[#2C221E]">
                {template.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-[#925003]">
                  {formatRupiah(template.price)}
                </span>
                <span className="text-sm text-[#A8988B] line-through">
                  {formatRupiah(template.price + 60000)}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Hemat 40%
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#6E5D4E]">
                {template.description}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="rounded-2xl border border-[#EFE7DC] bg-white p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#925003]">
                Fitur Lengkap Yang Disertakan:
              </h3>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs text-[#524439]">
                {template.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                      ✓
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Color Palette Chips */}
            {template.palette && template.palette.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8F7D6D] mb-2">
                  Palet Warna Tema:
                </h4>
                <div className="flex items-center gap-3">
                  {template.palette.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#6B5A4B]">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Order CTA Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="btnOrderNow"
                onClick={() => {
                  setOrderSuccess(null);
                  setIsModalOpen(true);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#925003] to-[#B36808] px-6 py-4 text-sm font-bold text-white shadow-lg transition duration-200 hover:from-[#7A4202] hover:to-[#9B5A07] hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>🛍️</span>
                <span>Pesan Sekarang via WhatsApp</span>
                <span className="font-bold">→</span>
              </button>

              <a
                href={adminConsultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-2xl border border-[#D5C2AA] bg-white px-6 py-3.5 text-center text-xs font-bold text-[#664624] shadow-2xs transition hover:bg-[#FAF4EC] flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Konsultasi / Tanya-Tanya Terlebih Dahulu</span>
              </a>

              <p className="text-center text-[11px] text-[#A39281]">
                ⚡ Tanpa repot login. Cukup isi form singkat dan langsung terhubung dengan Admin via WhatsApp.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Simple Order Intake Modal */}
      {isModalOpen && (
        <div
          id="orderModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalOrderTitle"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === "orderModal") {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-[#EBDCCB]">
            {/* Modal Header */}
            <div className="border-b border-[#F0E6D8] bg-[#FAF7F2] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#925003]">
                  Formulir Pemesanan Langsung
                </p>
                <h3 id="modalOrderTitle" className="text-base font-bold text-[#2C221E]">
                  Pesan Tema: {template.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-stone-500 shadow-xs hover:text-stone-900"
                aria-label="Tutup form"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {orderSuccess ? (
                /* Order Success View */
                <div className="text-center space-y-4 py-3">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold text-stone-900">
                    Pesanan Berhasil Disimpan!
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto">
                    Data Anda telah tercatat dengan status{" "}
                    <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      Ingin Memesan
                    </span>
                    . Halaman chat WhatsApp ke Admin sedang dibuka di tab baru.
                  </p>

                  <div className="pt-3 space-y-2.5">
                    {orderSuccess.whatsappUrl && (
                      <a
                        href={orderSuccess.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                      >
                        <span>💬 Buka Chat WhatsApp Admin</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setOrderSuccess(null);
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* Order Form */
                <form action={formAction} className="space-y-4">
                  {/* Honeypot anti-bot */}
                  <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
                  <input type="hidden" name="templateId" value={template.id.startsWith("preset-") ? "" : template.id} />
                  <input type="hidden" name="templateSlug" value={template.slug} />
                  <input type="hidden" name="templateTitle" value={template.name} />

                  {state?.error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                      ⚠️ {state.error}
                    </div>
                  )}

                  {/* Customer Name */}
                  <div>
                    <label htmlFor="customerName" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Nama Lengkap Anda <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="customerName"
                      type="text"
                      name="customerName"
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                    />
                  </div>

                  {/* Customer WhatsApp */}
                  <div>
                    <label htmlFor="customerWhatsapp" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="customerWhatsapp"
                      type="tel"
                      name="customerWhatsapp"
                      required
                      placeholder="Contoh: 081234567890"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Admin akan menghubungi Anda via WhatsApp ini untuk konfirmasi data undangan.
                    </span>
                  </div>

                  {/* Groom & Bride Names */}
                  <div>
                    <label htmlFor="groomBrideNames" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Nama Kedua Mempelai / Nama Acara <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="groomBrideNames"
                      type="text"
                      name="groomBrideNames"
                      required
                      placeholder="Contoh: Aulia & Fikri (atau nama yang berhajat)"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                    />
                  </div>

                  {/* Event Date & Location */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="eventDate" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                        Tanggal Acara
                      </label>
                      <input
                        id="eventDate"
                        type="date"
                        name="eventDate"
                        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="eventLocation" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                        Kota / Lokasi Acara
                      </label>
                      <input
                        id="eventLocation"
                        type="text"
                        name="eventLocation"
                        placeholder="Contoh: Jakarta Selatan"
                        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                      />
                    </div>
                  </div>

                  {/* Special Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      placeholder="Contoh: Tolong nuansa warnanya sage green lembut, ada doa tambahan di awal..."
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#925003] focus:outline-none focus:ring-2 focus:ring-[#925003]/20"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full rounded-xl bg-[#925003] py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-[#783e02] disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Menyimpan Pesanan & Menyiapkan WhatsApp...</span>
                        </>
                      ) : (
                        <>
                          <span>💬</span>
                          <span>Kirim Pesanan & Hubungi Admin WhatsApp</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-stone-400 mt-2">
                      Dengan mengirimkan pesanan, Anda akan langsung dialihkan ke chat WhatsApp Admin resmi.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

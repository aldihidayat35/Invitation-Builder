"use client";

import { useActionState, useState } from "react";
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

/* --- SVG Icons --- */
function IconWhatsApp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function IconChevronRight({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconExternalLink({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconStar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function IconSparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconSmartphone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function IconShieldCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconHeadphones({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function IconShoppingBag({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function IconClose({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconAlertCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

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
        try {
          window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
        } catch {
          // Fallback if browser blocks popups
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
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[#DFCBB5] bg-white text-[#8C5D2A] transition group-hover:-translate-x-0.5 group-hover:border-[#8C5D2A]">
              <IconChevronLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Kembali ke Katalog Utama</span>
            <span className="sm:hidden">Katalog</span>
          </Link>

          <Link href="/" className="font-serif text-lg font-bold tracking-tight text-[#2C221E] hover:opacity-90 transition">
            {appSettings?.appName || "Undangan.id"}
          </Link>

          <a
            href={adminConsultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D5C2AA] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#664624] shadow-2xs transition hover:border-[#8C5D2A] hover:bg-[#FAF4EC]"
          >
            <IconWhatsApp className="w-3.5 h-3.5 text-emerald-600" />
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
          <li className="text-stone-400">
            <IconChevronRight className="w-3 h-3" />
          </li>
          <li>
            <Link href="/#template" className="hover:text-[#664624] hover:underline">
              Katalog
            </Link>
          </li>
          <li className="text-stone-400">
            <IconChevronRight className="w-3 h-3" />
          </li>
          <li>
            <span className="font-semibold text-[#2C221E]">{template.name}</span>
          </li>
        </ol>
      </nav>

      {/* Main Product Detail Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 items-start">
          {/* Left Column: Visual Preview / Phone Mockup Showcase */}
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-[#E8DEC8] bg-gradient-to-b from-[#EFE9DF] to-[#E5DDD0] p-4 shadow-md sm:p-6">
              {/* Smartphone Frame Wrapper */}
              <div className="mx-auto max-w-[420px] rounded-[2.5rem] border-4 border-stone-800/80 bg-stone-900 p-2 shadow-2xl">
                {/* Notch / Speaker Ear */}
                <div className="mx-auto mb-2 h-4 w-28 rounded-full bg-stone-800/90 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-stone-700/60 mr-2" />
                  <div className="h-1.5 w-8 rounded-full bg-stone-700/60" />
                </div>

                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] bg-stone-100 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.thumbnailUrl}
                    alt={`Preview template ${template.name}`}
                    className="h-full w-full object-cover object-top transition duration-700 hover:scale-[1.03]"
                  />

                  {/* Category Pill Tag */}
                  <div className="absolute top-4 left-4 rounded-full bg-[#2C221E]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs border border-white/10 shadow-xs">
                    {template.category}
                  </div>

                  {/* Interactive Hint Overlay */}
                  <div className="absolute bottom-4 inset-x-4">
                    {template.previewUrl && (
                      <a
                        href={template.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-xs font-bold text-[#84633F] shadow-lg backdrop-blur-md transition hover:bg-[#84633F] hover:text-white"
                      >
                        <span>Buka Live Demo Undangan</span>
                        <IconExternalLink className="w-3.5 h-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges Under Mockup */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-[#6B5745] pt-1 border-t border-[#DCCFB9]/70">
                <div className="flex items-center gap-1.5 font-medium">
                  <IconSparkles className="w-4 h-4 text-amber-600" />
                  <span>Resolusi Full HD</span>
                </div>
                <span className="text-stone-300">•</span>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconSmartphone className="w-4 h-4 text-[#84633F]" />
                  <span>Mobile &amp; Web Responsive</span>
                </div>
                <span className="text-stone-300">•</span>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Garansi Revisi</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Template Information, Pricing & Order CTA */}
          <section className="space-y-6">
            <div>
              {/* Top rating & category bar */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#F2E5D0] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#925003] border border-[#E4D1B5]">
                  {template.category}
                </span>

                <div className="flex items-center gap-1 text-amber-400">
                  <IconStar className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <IconStar className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <IconStar className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <IconStar className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <IconStar className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="ml-1 text-xs font-semibold text-stone-600">
                    4.9/5 (100+ ulasan puas)
                  </span>
                </div>
              </div>

              <h1 className="font-serif mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[#2C221E]">
                {template.name}
              </h1>

              {/* Price Banner */}
              <div className="mt-4 flex flex-wrap items-baseline gap-3 rounded-2xl border border-[#EFE7DC] bg-[#FAF7F2] p-4">
                <span className="text-3xl font-black text-[#84633F]">
                  {formatRupiah(template.price)}
                </span>
                <span className="text-sm font-medium text-[#A8988B] line-through">
                  {formatRupiah(template.price + 60000)}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Hemat 40%
                </span>
                <p className="w-full text-[11px] text-stone-500 mt-1">
                  Harga final all-in termasuk server, domain tautan publik, dan musik latar gratis tanpa biaya langganan bulanan.
                </p>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#5C4D41]">
                {template.description}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="rounded-2xl border border-[#EFE7DC] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <IconSparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#925003]">
                  Fitur Lengkap Yang Disertakan:
                </h3>
              </div>

              <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-[#524439]">
                {template.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <IconCheck className="w-2.5 h-2.5" />
                    </span>
                    <span className="leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Color Palette Chips */}
            {template.palette && template.palette.length > 0 && (
              <div className="rounded-2xl border border-[#EFE7DC] bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8F7D6D] mb-2.5">
                  Palet Warna Tema:
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  {template.palette.map((c, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1.5 text-xs text-[#6B5A4B]"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="font-mono text-[10px] text-stone-400 uppercase">{c.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Service Guarantee Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white p-3 text-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[#84633F]">
                  <IconClock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-[11px] font-bold text-[#2C221E]">1-2 Hari Jadi</strong>
                  <span className="text-[10px] text-stone-500">Pengerjaan kilat</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white p-3 text-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <IconShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-[11px] font-bold text-[#2C221E]">Garansi Revisi</strong>
                  <span className="text-[10px] text-stone-500">Sampai terbit puas</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white p-3 text-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <IconHeadphones className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-[11px] font-bold text-[#2C221E]">Bantuan Admin</strong>
                  <span className="text-[10px] text-stone-500">Siap pandu data</span>
                </div>
              </div>
            </div>

            {/* Main Order CTA Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="btnOrderNow"
                onClick={() => {
                  setOrderSuccess(null);
                  setIsModalOpen(true);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#84633F] via-[#947048] to-[#A88258] px-6 py-4 text-sm font-bold text-white shadow-md transition duration-200 hover:brightness-105 hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2.5"
              >
                <IconShoppingBag className="w-5 h-5 text-amber-200" />
                <span>Pesan Sekarang via WhatsApp</span>
                <IconArrowRight className="w-4 h-4 ml-1" />
              </button>

              <a
                href={adminConsultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-2xl border border-[#D5C2AA] bg-white px-6 py-3.5 text-center text-xs font-bold text-[#664624] shadow-2xs transition hover:bg-[#FAF4EC] flex items-center justify-center gap-2"
              >
                <IconWhatsApp className="w-4 h-4 text-emerald-600" />
                <span>Konsultasi / Tanya-Tanya Terlebih Dahulu</span>
              </a>

              <p className="text-center text-[11px] text-[#A39281] flex items-center justify-center gap-1.5">
                <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tanpa repot login. Cukup isi formulir singkat dan langsung terhubung dengan Admin via WhatsApp.</span>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#84633F]">
                  Formulir Pemesanan Langsung
                </p>
                <h3 id="modalOrderTitle" className="text-base font-bold text-[#2C221E]">
                  Pesan Tema: {template.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#664624] hover:text-[#2C221E] border border-[#EBDCCB] shadow-xs transition"
                aria-label="Tutup form"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {orderSuccess ? (
                /* Order Success View */
                <div className="text-center space-y-4 py-3">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                    <IconCheck className="w-8 h-8" />
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
                        <IconWhatsApp className="w-4 h-4" />
                        <span>Buka Chat WhatsApp Admin</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setOrderSuccess(null);
                      }}
                      className="w-full rounded-xl border border-[#D9CFC4] bg-white px-5 py-2.5 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] hover:text-[#2C221E] shadow-2xs transition"
                    >
                      Selesai &amp; Tutup
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
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                      <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{state.error}</span>
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
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
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
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
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
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
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
                        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
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
                        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
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
                      placeholder="Contoh: Nuansa tema adat Jawa elegan, mohon sertakan doa pembuka..."
                      className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#84633F] focus:outline-none focus:ring-2 focus:ring-[#84633F]/20"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full rounded-xl bg-[#84633F] hover:bg-[#715332] py-3.5 px-4 text-xs font-bold text-white shadow-md disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <IconSpinner className="w-4 h-4 text-white" />
                          <span>Menyimpan Pesanan &amp; Menyiapkan WhatsApp...</span>
                        </>
                      ) : (
                        <>
                          <IconWhatsApp className="w-4 h-4 text-white" />
                          <span>Kirim Pesanan &amp; Hubungi Admin WhatsApp</span>
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

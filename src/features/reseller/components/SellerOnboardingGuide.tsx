"use client";

import Link from "next/link";
import { useState } from "react";

interface SellerOnboardingGuideProps {
  agencyName: string;
  slug: string;
  showDashboardLink?: boolean;
}

const STEPS = [
  {
    step: "01",
    icon: "🏪",
    title: "Lengkapi Profil & Toko Anda",
    description:
      "Isi nama agensi, nomor WhatsApp, logo, dan warna brand. Toko Anda akan tampil profesional di mata calon pengantin.",
    href: "/dashboard/reseller/storefront",
    cta: "Lengkapi Profil Toko →",
    color: "from-amber-50 to-orange-50",
    border: "border-amber-200",
  },
  {
    step: "02",
    icon: "🔗",
    title: "Bagikan Tautan Toko ke Calon Pengantin",
    description:
      "Salin tautan etalase toko Anda dan bagikan via WhatsApp, Instagram, atau media sosial. Calon pengantin bisa langsung melihat katalog template dan memesan.",
    href: null,
    cta: null,
    color: "from-rose-50 to-pink-50",
    border: "border-rose-200",
  },
  {
    step: "03",
    icon: "📋",
    title: "Formulir Pesanan Masuk Otomatis",
    description:
      "Setelah calon pengantin mengisi formulir di toko Anda, pesanan langsung masuk ke antrean pengerjaan Admin Platform. Tidak ada yang perlu Anda lakukan secara teknis!",
    href: "/dashboard/reseller/orders",
    cta: "Pantau Pesanan →",
    color: "from-blue-50 to-indigo-50",
    border: "border-blue-200",
  },
  {
    step: "04",
    icon: "🎨",
    title: "Admin Platform Mengerjakan Desain",
    description:
      "Tim Admin Platform akan mendesain, mengisi data, dan menerbitkan undangan digital sesuai pesanan. Anda bisa memantau progresnya di dashboard pesanan.",
    href: null,
    cta: null,
    color: "from-violet-50 to-purple-50",
    border: "border-violet-200",
  },
  {
    step: "05",
    icon: "✅",
    title: "Undangan Selesai & Dikirim ke Customer",
    description:
      "Setelah undangan selesai dan disetujui, tautan undangan diberikan ke pengantin. Nama toko/agensi Anda tetap tampil (white-label), bukan nama platform.",
    href: null,
    cta: null,
    color: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
  },
];

const RULES = [
  {
    icon: "🤝",
    title: "Seller sebagai Mitra Pemasaran",
    desc: "Tugas utama Seller adalah mempromosikan toko dan mendatangkan calon pengantin yang ingin memesan undangan digital. Seller BUKAN desainer teknis.",
  },
  {
    icon: "🛡️",
    title: "Admin Platform Mengerjakan Teknis",
    desc: "Seluruh proses desain, pengisian data, dan penerbitan undangan digital dikerjakan oleh Admin Platform. Seller tidak perlu memiliki keahlian teknis desain.",
  },
  {
    icon: "🏷️",
    title: "White-Label: Identitas Toko Anda",
    desc: "Undangan yang diterima customer akan menampilkan nama agensi/toko Seller, bukan nama platform. Branding Anda tetap terjaga.",
  },
  {
    icon: "📊",
    title: "Transparansi Status Pesanan",
    desc: "Seller dapat memantau status setiap pesanan (Baru → Dikerjakan → Review → Selesai) secara real-time di dashboard. Tidak ada informasi yang tersembunyi.",
  },
  {
    icon: "💼",
    title: "Domain & Branding Khusus",
    desc: "Seller dapat menghubungkan domain kustom (misalnya: toko.namaanda.com) agar toko terlihat lebih profesional dan terpercaya.",
  },
  {
    icon: "🚫",
    title: "Seller Dilarang Mengedit Undangan",
    desc: "Seller tidak memiliki akses untuk mengedit atau mengubah konten undangan secara langsung. Semua permintaan perubahan disampaikan ke Admin Platform melalui catatan pesanan.",
  },
];

const FAQ = [
  {
    q: "Apakah saya perlu keahlian desain untuk menjadi Seller?",
    a: "Sama sekali tidak! Tugas Seller hanya memasarkan toko dan menerima pesanan. Tim Admin Platform yang mengerjakan seluruh desain teknis.",
  },
  {
    q: "Berapa lama proses pengerjaan undangan?",
    a: "Umumnya 1–3 hari kerja setelah formulir pesanan lengkap diterima. Anda bisa memantau progress di halaman Pesanan.",
  },
  {
    q: "Bagaimana cara customer memesan lewat toko saya?",
    a: "Customer mengunjungi tautan toko Anda, memilih template yang diinginkan, dan mengisi formulir pemesanan. Pesanan langsung masuk ke sistem.",
  },
  {
    q: "Apakah saya bisa menggunakan domain sendiri?",
    a: 'Ya! Anda bisa menghubungkan domain kustom Anda di menu "Branding & Domain". Domain kustom membuat toko terlihat lebih profesional.',
  },
  {
    q: "Apa yang harus saya lakukan setelah pesanan masuk?",
    a: "Tidak ada yang perlu Anda lakukan secara teknis. Admin Platform akan langsung mengerjakan pesanan. Anda hanya perlu memantau status di dashboard.",
  },
];

export function SellerOnboardingGuide({
  agencyName,
  slug,
  showDashboardLink,
}: SellerOnboardingGuideProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(135deg, #2C221E 0%, #3D2C25 40%, #5C3D28 100%)" }}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, #C4873A 0%, transparent 70%)", opacity: 0.08 }}
        />
        <div className="relative px-8 py-10 sm:px-12 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                <span>🎉</span> Panduan & Aturan Resmi Seller
              </div>
              <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Halo, {agencyName}! 👋
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-300">
                Selamat datang di platform kemitraan undangan digital. Panduan ini menjelaskan cara kerja,
                alur pemrosesan pesanan oleh Admin, dan aturan kemitraan white-label.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
              <Link
                href="/dashboard/reseller/storefront"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-lg transition-colors hover:bg-[#BD9B2F]"
              >
                <span>⚡</span> Setup Toko Sekarang
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/seller/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-600 px-4 py-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-stone-700"
                >
                  Lihat Toko Anda ↗
                </a>
                {showDashboardLink ? (
                  <Link
                    href="/dashboard/reseller?view=dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-600 bg-white/10 px-4 py-2 text-xs font-semibold text-stone-200 transition-colors hover:bg-white/20"
                  >
                    Buka Dashboard →
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/reseller"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-600 bg-white/10 px-4 py-2 text-xs font-semibold text-stone-200 transition-colors hover:bg-white/20"
                  >
                    ← Ke Dashboard Utama
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Toko Anda", value: `/seller/${slug}`, note: "Tautan publik" },
              { label: "Status Akun", value: "✅ Aktif", note: "Siap menerima pesanan" },
              { label: "Mode Operasi", value: "White-Label", note: "Brand Anda tampil" },
              { label: "Desainer", value: "Admin Platform", note: "Teknisi tersertifikasi" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                  {item.label}
                </div>
                <div className="mt-1 truncate text-sm font-bold text-white">{item.value}</div>
                <div className="mt-0.5 text-[10px] text-stone-400">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Steps */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-xs font-black text-[#2C221E]">
            5
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#2C221E]">Cara Kerja Sistem Seller</h2>
            <p className="text-xs text-stone-500">
              5 langkah mudah dari registrasi hingga customer menerima undangan
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`flex gap-4 rounded-2xl border bg-gradient-to-r p-5 transition-shadow hover:shadow-md ${step.color} ${step.border}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-xl shadow-sm">
                {step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Langkah {step.step}
                </span>
                <h3 className="mt-1 text-sm font-bold text-[#2C221E]">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">{step.description}</p>
                {step.href && step.cta && (
                  <Link
                    href={step.href}
                    className="mt-2 inline-flex items-center text-xs font-semibold text-[#84633F] underline-offset-2 hover:underline"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
            📜
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#2C221E]">
              Aturan & Kebijakan Kemitraan Seller
            </h2>
            <p className="text-xs text-stone-500">Harap baca dan pahami aturan berikut</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-2xl">
                {rule.icon}
              </div>
              <h3 className="text-sm font-bold text-[#2C221E]">{rule.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{rule.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <span className="mt-0.5 shrink-0 text-lg">⚠️</span>
          <div>
            <p className="text-xs font-bold text-rose-800">Penting: Pelanggaran Aturan</p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-700">
              Seller yang terbukti melanggar aturan kemitraan dapat dinonaktifkan oleh Admin Platform
              tanpa pemberitahuan sebelumnya. Pastikan Anda selalu transparan dengan customer.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-700">
            ❓
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#2C221E]">Pertanyaan Umum (FAQ) Seller</h2>
            <p className="text-xs text-stone-500">Klik pertanyaan untuk melihat jawaban</p>
          </div>
        </div>
        <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-xs">
          {FAQ.map((item, idx) => (
            <div key={idx} className="group">
              <button
                type="button"
                id={`faq-btn-${idx}`}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-[#2C221E] transition-colors group-hover:text-[#84633F]">
                  {item.q}
                </span>
                <span
                  className={`shrink-0 text-stone-400 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              {openFaq === idx && (
                <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-4">
                  <p className="text-xs leading-relaxed text-stone-600">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        className="rounded-3xl p-8 text-center"
        style={{ background: "linear-gradient(135deg, #FAF8F5 0%, #F5F0E8 100%)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          🎯 Siap untuk memulai?
        </p>
        <h3 className="mt-2 text-xl font-extrabold text-[#2C221E]">
          Lengkapi profil toko Anda sekarang!
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Toko yang lengkap dengan logo, deskripsi, dan kontak WhatsApp akan lebih dipercaya calon
          pengantin.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/reseller/storefront"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2C221E] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#3D2C25]"
          >
            ⚡ Setup Profil Toko Sekarang
          </Link>
          <Link
            href="/dashboard/reseller/branding"
            className="inline-flex items-center gap-2 rounded-xl border border-[#D9CFC4] bg-white px-5 py-2.5 text-xs font-semibold text-[#664624] shadow-xs transition-colors hover:bg-[#FAF8F5]"
          >
            🎨 Atur Branding &amp; Domain
          </Link>
          {showDashboardLink ? (
            <Link
              href="/dashboard/reseller?view=dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-5 py-2.5 text-xs font-semibold text-stone-700 shadow-xs transition-colors hover:bg-stone-200"
            >
              📊 Buka Dashboard Analitik
            </Link>
          ) : (
            <Link
              href="/dashboard/reseller"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-5 py-2.5 text-xs font-semibold text-stone-700 shadow-xs transition-colors hover:bg-stone-200"
            >
              ← Kembali ke Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

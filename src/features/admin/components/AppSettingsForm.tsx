"use client";

import React, { useState } from "react";
import type { AppSettings } from "@/features/admin/types";

interface AppSettingsFormProps {
  initialSettings: AppSettings;
}

export function AppSettingsForm({ initialSettings }: AppSettingsFormProps) {
  const [formData, setFormData] = useState({
    appName: initialSettings.appName || "Undangan.id",
    appTagline: initialSettings.appTagline || "Undangan Digital, Lebih Berkesan",
    appLogo: initialSettings.appLogo || "",
    companyName: initialSettings.companyName || "Undangan.id",
    contactPhone: initialSettings.contactPhone || "+62 812-3456-7890",
    contactWhatsapp: initialSettings.contactWhatsapp || "6281234567890",
    contactEmail: initialSettings.contactEmail || "support@undangan.id",
    address: initialSettings.address || "Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190",
    footerDescription:
      initialSettings.footerDescription ||
      "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.",
    heroBackgroundImage: initialSettings.heroBackgroundImage || "",
    siteUrl: initialSettings.siteUrl || "",
    metaTitle: initialSettings.metaTitle || "",
    metaDescription: initialSettings.metaDescription || "",
    metaKeywords: initialSettings.metaKeywords || "",
    ogImage: initialSettings.ogImage || "",
    googleSiteVerification: initialSettings.googleSiteVerification || "",
    googleAnalyticsId: initialSettings.googleAnalyticsId || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotification({
        type: "error",
        message: "File yang dipilih harus berupa gambar (PNG, JPG, SVG, WebP).",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Ukuran file logo maksimal 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({ ...prev, appLogo: result }));
      setNotification({
        type: "success",
        message: "Logo berhasil diunggah. Klik 'Simpan Pengaturan' untuk menerapkan perubahan.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, appLogo: "" }));
  };

  const handleHeroBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotification({
        type: "error",
        message: "File yang dipilih harus berupa gambar (PNG, JPG, WebP).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Ukuran file background maksimal 5MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({ ...prev, heroBackgroundImage: result }));
      setNotification({
        type: "success",
        message: "Gambar background hero berhasil diunggah. Klik 'Simpan Pengaturan' untuk menerapkan perubahan.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveHeroBg = () => {
    setFormData((prev) => ({ ...prev, heroBackgroundImage: "" }));
  };

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotification({
        type: "error",
        message: "File yang dipilih harus berupa gambar (PNG, JPG, WebP).",
      });
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "Ukuran file banner OG maksimal 4MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({ ...prev, ogImage: result }));
      setNotification({
        type: "success",
        message: "Banner sosial media (OG Image) berhasil diunggah.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveOgImage = () => {
    setFormData((prev) => ({ ...prev, ogImage: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal menyimpan pengaturan aplikasi.");
      }

      setNotification({
        type: "success",
        message: "Pengaturan aplikasi berhasil disimpan dan diterapkan ke seluruh sistem!",
      });

      // Reload window after brief delay to refresh server components and active sessions
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const brandInitials =
    formData.appName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "UI";

  return (
    <div className="space-y-8">
      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium shadow-sm transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <span className="text-lg">
            {notification.type === "success" ? "✓" : "⚠️"}
          </span>
          <div className="flex-1">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-time Preview Cards */}
      <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Pratinjau Tampilan Dinamis
            </h2>
            <p className="text-xs text-stone-500">
              Lihat bagaimana logo dan nama aplikasi akan muncul di Header, Sidebar, dan Footer.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200/80">
            Live Preview
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Header Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              1. Header Landing Page (Navbar & Hero)
            </span>
            <div
              className="overflow-hidden rounded-xl border border-stone-800 p-4 text-white shadow-inner flex items-center justify-between relative"
              style={{
                background: formData.heroBackgroundImage
                  ? `linear-gradient(90deg, rgba(15,15,15,0.88) 0%, rgba(18,18,18,0.7) 100%), url('${formData.heroBackgroundImage}') center/cover no-repeat`
                  : `linear-gradient(90deg, rgba(15,15,15,0.92) 0%, rgba(20,20,20,0.8) 100%), url('/images/landing-hero.jpg') center/cover no-repeat, #161616`,
              }}
            >
              <div className="flex items-center gap-3 relative z-10">
                {formData.appLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.appLogo}
                    alt="Logo Preview"
                    className="h-8 w-auto max-w-[120px] object-contain rounded"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#925003] text-xs font-bold text-white shadow">
                    {brandInitials}
                  </div>
                )}
                <span className="font-serif text-lg font-bold tracking-tight text-white">
                  {formData.appName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-300 relative z-10">
                <span className="hover:text-amber-400 cursor-pointer">Template</span>
                <span className="hover:text-amber-400 cursor-pointer">Harga</span>
                <span className="rounded bg-[#925003] px-3 py-1 text-[11px] font-semibold text-white">
                  Daftar
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar Top Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              2. Sidebar Dashboard Super Admin & User
            </span>
            <div className="overflow-hidden rounded-xl border border-[#262220] bg-[#181513] p-4 text-white shadow-inner flex items-center gap-3.5">
              {formData.appLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.appLogo}
                  alt="Logo Preview"
                  className="h-10 w-10 shrink-0 rounded-xl object-contain bg-white/10 p-1 border border-white/10"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-sm font-black text-[#2C221E] shadow-md">
                  {brandInitials}
                </div>
              )}
              <div className="overflow-hidden">
                <h4 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-white leading-tight">
                  <span className="truncate">{formData.appName}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                </h4>
                <p className="mt-0.5 text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase truncate">
                  {formData.appTagline || "PLATFORM UNDANGAN"}
                </p>
              </div>
            </div>
          </div>

          {/* Google Search Result (SERP) Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              3. Hasil Pencarian Google (SERP Preview)
            </span>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-1.5 font-sans">
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-amber-900 border border-stone-200">
                  {brandInitials.charAt(0)}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-stone-800 text-[11px]">{formData.appName || "Undangan.id"}</span>
                  <span className="text-[10px] text-stone-400 truncate max-w-xs">
                    {formData.siteUrl || "https://undangan.id"}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-snug line-clamp-1">
                {formData.metaTitle || `${formData.appName || "Undangan.id"} — ${formData.appTagline || "Template Undangan Digital"}`}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                {formData.metaDescription || formData.footerDescription || "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna."}
              </p>
            </div>
          </div>

          {/* Social Media Share (Open Graph) Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              4. Pratinjau Kartu Berbagi WhatsApp & Medsos
            </span>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-sm max-w-md">
              <div className="relative h-28 bg-[#181513] overflow-hidden flex items-center justify-center">
                {formData.ogImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.ogImage}
                    alt="OG Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-white">
                    <span className="text-xs font-bold text-[#d4af37] block">
                      {formData.appName || "Undangan.id"}
                    </span>
                    <span className="text-[10px] text-stone-300">
                      Dynamic Open Graph Banner (1200 × 630 px)
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white border-t border-stone-200">
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider block">
                  {formData.siteUrl ? new URL(formData.siteUrl.startsWith("http") ? formData.siteUrl : `https://${formData.siteUrl}`).hostname : "undangan.id"}
                </span>
                <h4 className="text-xs font-bold text-stone-800 line-clamp-1 mt-0.5">
                  {formData.metaTitle || `${formData.appName} — ${formData.appTagline}`}
                </h4>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  {formData.metaDescription || formData.footerDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 1: Identitas Aplikasi */}
          <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span>🏷️</span> Identitas Aplikasi & Logo
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Nama brand, logo utama, dan slogan aplikasi.
              </p>
            </div>

            {/* Nama Aplikasi */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Nama Aplikasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="appName"
                required
                value={formData.appName}
                onChange={handleInputChange}
                placeholder="Contoh: Undangan.id"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Slogan / Tagline */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Slogan / Tagline
              </label>
              <input
                type="text"
                name="appTagline"
                value={formData.appTagline}
                onChange={handleInputChange}
                placeholder="Contoh: Undangan Digital, Lebih Berkesan"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Logo Upload & Input */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Logo Aplikasi
              </label>

              <div className="flex items-center gap-4">
                {formData.appLogo ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.appLogo}
                      alt="Logo Aplikasi"
                      className="h-16 w-16 rounded-xl border border-stone-300 bg-stone-50 object-contain p-1 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow hover:bg-rose-700"
                      title="Hapus Logo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-xs font-bold text-stone-400">
                    No Logo
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors">
                    <span>Unggah Berkas Gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-stone-500">
                    PNG, JPG, SVG, atau WebP (Maks. 2MB).
                  </p>
                </div>
              </div>

              {/* URL alternatif */}
              <div className="mt-3">
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Atau masukkan URL gambar langsung:
                </label>
                <input
                  type="url"
                  name="appLogo"
                  value={formData.appLogo}
                  onChange={handleInputChange}
                  placeholder="https://domain.com/logo.png"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Background Hero Landing Page */}
            <div className="border-t border-stone-200/70 pt-5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                Background Hero Landing Page
              </label>
              <p className="text-xs text-stone-500 mb-3">
                Gambar latar belakang utama untuk header & hero section paling atas di halaman depan (Landing Page).
              </p>

              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-stone-300 bg-stone-100 h-36 max-w-lg shadow-inner group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.heroBackgroundImage || "/images/landing-hero.jpg"}
                    alt="Preview Background Hero"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-between p-3 text-white text-xs">
                    <div>
                      <span className="font-bold block">
                        {formData.heroBackgroundImage ? "Background Kustom Aktif" : "Background Bawaan (Default)"}
                      </span>
                      <span className="text-[10px] text-stone-300">
                        {formData.heroBackgroundImage ? "Diterapkan dinamis di halaman depan" : "/images/landing-hero.jpg"}
                      </span>
                    </div>
                    {formData.heroBackgroundImage && (
                      <button
                        type="button"
                        onClick={handleRemoveHeroBg}
                        className="rounded-lg bg-rose-600/90 hover:bg-rose-700 px-2.5 py-1 text-[11px] font-semibold text-white transition shadow"
                      >
                        Gunakan Default
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors">
                    <span>Unggah Background Hero Baru</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroBgUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-stone-400">
                    Format JPG, PNG, WebP (Maks. 5MB)
                  </span>
                </div>

                {/* Rekomendasi Kualitas & Rasio Gambar */}
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs tracking-wide">
                    <span>💡</span> Rekomendasi Format, Rasio & Kualitas Gambar Background:
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-[11.5px] text-amber-800 leading-relaxed">
                    <li>
                      <strong>Rasio Aspek (Aspect Ratio):</strong> Disarankan rasio <strong>16:9</strong> atau <strong>16:10</strong> (Format Lanskap / Widescreen Desktop).
                    </li>
                    <li>
                      <strong>Resolusi & Dimensi:</strong> Minimal <strong>1920 × 1080 px</strong> (Full HD) atau <strong>2560 × 1440 px</strong> (2K/QHD) agar gambar tetap tajam dan tidak pecah di layar besar.
                    </li>
                    <li>
                      <strong>Kualitas Gambar:</strong> Gunakan foto beresolusi tinggi dengan pencahayaan seimbang. Gambar akan ditampilkan <em>natural dan jernih tanpa pelapis gelap</em> di halaman depan.
                    </li>
                    <li>
                      <strong>Format & Ukuran Berkas:</strong> Disarankan format <strong>WebP</strong> atau <strong>JPG</strong> (Quality 85–90%) dengan ukuran di bawah <strong>2 MB</strong> (maksimal 5 MB) agar loading halaman tetap cepat.
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-1">
                    Atau gunakan URL gambar online langsung:
                  </label>
                  <input
                    type="url"
                    name="heroBackgroundImage"
                    value={formData.heroBackgroundImage}
                    onChange={handleInputChange}
                    placeholder="https://example.com/banner-hero.jpg"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Profil & Perusahaan */}
          <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span>🏢</span> Informasi Perusahaan & Legalitas
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Nama resmi entitas bisnis untuk copyright dan footer.
              </p>
            </div>

            {/* Nama Perusahaan */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Nama Perusahaan / Usaha <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Contoh: PT Undangan Digital Indonesia"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Deskripsi Footer */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Deskripsi Singkat Footer
              </label>
              <textarea
                name="footerDescription"
                rows={4}
                value={formData.footerDescription}
                onChange={handleInputChange}
                placeholder="Tuliskan deskripsi profil singkat yang akan tampil di bagian bawah halaman..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Section 3: Kontak & Komunikasi */}
          <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span>📞</span> Kontak & Bantuan Pengguna
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Informasi narahubung resmi yang dapat dihubungi pengunjung.
              </p>
            </div>

            {/* Nomor WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Nomor WhatsApp Admin / CS
              </label>
              <input
                type="text"
                name="contactWhatsapp"
                value={formData.contactWhatsapp}
                onChange={handleInputChange}
                placeholder="Contoh: 6281234567890 (Gunakan kode negara tanpa tanda +)"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                Digunakan untuk tombol &ldquo;Konsultasi CS via WhatsApp&rdquo; di landing page.
              </span>
            </div>

            {/* Telepon */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Nomor Telepon Kantor
              </label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="Contoh: +62 812-3456-7890"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Email Dukungan */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Email Dukungan / Layanan Pelanggan
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="support@domain.com"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Section 4: Alamat Operasional */}
          <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span>📍</span> Alamat Kantor & Workshop
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Lokasi fisik perusahaan yang ditampilkan pada footer dan halaman kontak.
              </p>
            </div>

            {/* Alamat Lengkap */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                Alamat Lengkap
              </label>
              <textarea
                name="address"
                rows={5}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Jl. Sudirman No. 123, Kelurahan, Kecamatan, Kota, Kode Pos..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Pengaturan SEO & Webmaster (Google Search, Analytics, Meta Tags) */}
        <div className="rounded-2xl border border-[#E8E2D8] bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-200 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span>🚀</span> Pengaturan SEO, Meta Tags & Webmaster
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Konfigurasi mesin pencari Google, meta tags Open Graph media sosial, verifikasi domain, dan analitik.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              SEO Engine Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Kolom Kiri: Metadata & Search Optimization */}
            <div className="space-y-4">
              {/* Canonical URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  URL Situs Utama (Canonical Domain URL)
                </label>
                <input
                  type="url"
                  name="siteUrl"
                  value={formData.siteUrl}
                  onChange={handleInputChange}
                  placeholder="https://undangan.id (tanpa garis miring di akhir)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Digunakan untuk sitemap.xml, robots.txt, canonical link, dan base URL Open Graph. Jika kosong, sistem otomatis memakai host request / NEXT_PUBLIC_SITE_URL.
                </p>
              </div>

              {/* Meta Title Default */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Judul Meta Utama (Default Meta Title)
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Contoh: Undangan.id — Template Undangan Digital Elegan & Modern"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Judul yang muncul di tab browser dan hasil pencarian Google ({formData.metaTitle.length}/60 karakter ideal).
                </p>
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Deskripsi Meta (Default Meta Description)
                </label>
                <textarea
                  name="metaDescription"
                  rows={3}
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  placeholder="Deskripsi singkat menarik tentang platform untuk ditampilkan di hasil pencarian Google..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Disarankan antara 120–160 karakter ({formData.metaDescription.length} karakter saat ini).
                </p>
              </div>

              {/* Meta Keywords */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Kata Kunci Pencarian (Meta Keywords)
                </label>
                <input
                  type="text"
                  name="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={handleInputChange}
                  placeholder="undangan digital, template undangan pernikahan, undangan website, rsvp online"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Pisahkan beberapa kata kunci dengan tanda koma (,).
                </p>
              </div>
            </div>

            {/* Kolom Kanan: Webmaster, Analytics & Open Graph Image */}
            <div className="space-y-4">
              {/* Open Graph Image */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Gambar Banner Pratinjau Sosial Media (OG Image)
                </label>
                <div className="space-y-3">
                  {formData.ogImage ? (
                    <div className="relative rounded-xl border border-stone-300 bg-stone-100 overflow-hidden h-32 max-w-sm shadow-inner group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.ogImage}
                        alt="OG Banner"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveOgImage}
                        className="absolute top-2 right-2 rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white shadow hover:bg-rose-700"
                      >
                        Hapus Banner
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors">
                      <span>{formData.ogImage ? "Ganti Banner OG" : "Unggah Banner OG (1200 × 630 px)"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOgImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-stone-400">
                      PNG, JPG, WebP (Rasio 1.91:1)
                    </span>
                  </div>

                  <input
                    type="url"
                    name="ogImage"
                    value={formData.ogImage}
                    onChange={handleInputChange}
                    placeholder="Atau masukkan URL gambar banner eksternal..."
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-stone-500">
                    Jika dikosongkan, sistem otomatis membuat banner 1200x630 dinamis secara otomatis melalui endpoint <code>/api/og</code>.
                  </p>
                </div>
              </div>

              {/* Google Search Console Verification */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Kode Verifikasi Google Search Console
                </label>
                <input
                  type="text"
                  name="googleSiteVerification"
                  value={formData.googleSiteVerification}
                  onChange={handleInputChange}
                  placeholder="Contoh: v8kQ3_e98xZ_example_code atau kode dari tag meta"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Masukkan nilai kode verifikasi HTML Tag dari Google Search Console untuk membuktikan kepemilikan situs.
                </p>
              </div>

              {/* Google Analytics 4 ID */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Google Analytics 4 Measurement ID (GA4)
                </label>
                <input
                  type="text"
                  name="googleAnalyticsId"
                  value={formData.googleAnalyticsId}
                  onChange={handleInputChange}
                  placeholder="Contoh: G-XXXXXXXXXX"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 placeholder-stone-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Script Google Analytics (gtag.js) akan otomatis diinjeksikan secara aman pada seluruh halaman publik saat ID ini diisi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-4 rounded-2xl border border-[#E8E2D8] bg-white p-5 shadow-xs">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#B47A39] to-[#925003] px-7 py-3 text-sm font-bold text-white shadow-md shadow-amber-950/20 hover:from-[#A26C30] hover:to-[#7E4402] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Menyimpan Pengaturan...</span>
              </>
            ) : (
              <>
                <span>💾 Simpan Pengaturan Aplikasi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
